// ═══════════════════════════════════════════════════════════
// 📁 /worker/GenerationWorker.ts — Generation Worker
// ═══════════════════════════════════════════════════════════

import { randomUUID } from "crypto";
import { queueManager, QUEUE_NAMES } from "../queue/QueueManager.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { env } from "../utils/env.js";
import { ErrorHandler } from "./ErrorHandler.js";
import { aiService } from "../services/ai/AIService.js";
import { waitForJobCompletion, setupShutdownHandlers } from "./workerUtils.js";
import { jobManagementService } from "../queue/JobManagementService.js";
import { getUserTier } from "../utils/user.helpers.js";
import { getUserActivePlan, computeTotalCost } from "../services/credits/creditEnforcement.service.js";
import { deductCredits, restoreCredits, logCreditEvent } from "../services/credits/creditLedger.service.js";
import { TONE_PRESET_MAP } from "@creatorjot/shared";
import type { GenerationQueueJob } from "../queue/types.js";
import type { RichContext, PostAngle, Platforms, UserActivePlan } from "@creatorjot/shared";
import type { NotificationService } from "../notifications/index.js";

export class GenerationWorker {
  private workerId: string;
  private isRunning: boolean = false;
  private currentJobId: string | null = null;
  private shutdownTimeout: number = 30000;
  private errorHandler: ErrorHandler;
  private notificationService: NotificationService | null = null;

  constructor(notificationService?: NotificationService) {
    this.workerId = `generation-worker-${randomUUID().slice(0, 8)}`;
    this.errorHandler = new ErrorHandler(notificationService);
    this.notificationService = notificationService || null;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("GenerationWorker already running", { workerId: this.workerId });
      return;
    }

    this.isRunning = true;
    logger.info("GenerationWorker started", { workerId: this.workerId });

    await queueManager.subscribe<GenerationQueueJob>(
      QUEUE_NAMES.GENERATION,
      async (job) => {
        await this.processJob(job.data);
      },
      { teamSize: 1, teamConcurrency: 5 }
    );

    setupShutdownHandlers(() => this.stop(), this.workerId);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info("GenerationWorker stopping", { workerId: this.workerId });
    this.isRunning = false;

    if (this.currentJobId) {
      await waitForJobCompletion(
        () => this.currentJobId,
        (jobId) => this.updateJobStatus(jobId, { status: "pending" }),
        this.workerId,
        this.shutdownTimeout
      );
    }

    logger.info("GenerationWorker stopped", { workerId: this.workerId });
  }

  /**
   * Process a single generation job.
   *
   * Flow:
   *   1. Fetch transcript row: select rich_context, rich_context_extracted_at, yt_id
   *   2. If rich_context_extracted_at IS NULL — re-enqueue transcript + generation jobs,
   *      mark current job completed (chain pattern — not an error)
   *   3. Parse rich_context as RichContext; resolve PostAngle:
   *      - If post_angle_index is set: use post_angles[post_angle_index] (throw if out of bounds)
   *      - If absent/null: select angle with highest score (lowest index on tie) — AutoGeneration
   *   4. Fetch UserTone by user_tone_id if present; extract tone_prompt as userSavedTone
   *   5. Generate content via aiService.generateContent({ postAngle, videoSummary, platform, language, userSavedTone })
   *   6. Save to generations table using payload_id
   *   7. Update generation_id on generation_queue row
   *   8. Send notification
   */
  async processJob(job: GenerationQueueJob): Promise<void> {
    this.currentJobId = job.id;

    // Track plan/cost for credit restoration on failure
    let userPlanForRestore: UserActivePlan | null = null;
    let generationCostForRestore = 0;

    try {
      logger.info("Processing generation job", {
        workerId: this.workerId,
        jobId: job.id,
        transcriptId: job.transcriptId,
        platform: job.platform,
        userId: job.userId,
        attempts: (job.attempts ?? 0) + 1,
      });

      await this.updateJobStatus(job.id, {
        status: "processing",
        processingStartedAt: new Date(),
      });
      await this.logJobEvent(job.id, "started", "Job processing started");

      // ── Step 1: Fetch transcript row ───────────────────
      await this.updateProgress(job.id, 10, "Verifying transcript record");

      // Fetch actual user tier once — used for re-enqueue priority + AI model selection
      const userTier = await getUserTier(job.userId);

      const { data: transcriptRow, error: transcriptError } = await supabase
        .from("transcript")
        .select("id, yt_id, rich_context, rich_context_extracted_at")
        .eq("id", job.transcriptId)
        .single();

      if (transcriptError || !transcriptRow) {
        throw new Error(
          `Transcript record not found for id: ${job.transcriptId}` +
          (transcriptError ? ` — DB error: ${transcriptError.message} (code: ${transcriptError.code})` : "")
        );
      }

      // ── Step 2: Check rich_context readiness — re-enqueue chain if not ready ──
      if (transcriptRow.rich_context_extracted_at === null) {
        logger.info("Transcript rich_context not yet extracted — re-enqueuing transcript + generation jobs", {
          workerId: this.workerId,
          jobId: job.id,
          transcriptId: job.transcriptId,
        });

        // Re-enqueue transcript job
        await jobManagementService.enqueueTranscriptJob({
          userId: job.userId,
          ytId: transcriptRow.yt_id,
          sessionId: job.sessionId,
          userTier,
        });

        // Re-enqueue this generation job (new job, current one closes)
        await jobManagementService.enqueueGenerationJob({
          userId: job.userId,
          transcriptId: job.transcriptId,
          payloadId: job.payloadId,
          sessionId: job.sessionId,
          platform: job.platform,
          outputLang: job.outputLang,
          userToneId: job.userToneId,
          userTier,
          postAngleIndex: job.postAngleIndex,
          xPostFormat: job.xPostFormat,
        });

        // Mark current job as completed (it handed off to the new chain)
        await this.updateJobStatus(job.id, { status: "completed" });
        await this.logJobEvent(job.id, "completed", "Re-enqueued transcript + generation chain — rich_context not yet extracted");
        this.currentJobId = null;
        return;
      }

      // ── Step 3: Resolve PostAngle ──────────────────────
      await this.updateProgress(job.id, 25, "Resolving post angle");

      const richContext = transcriptRow.rich_context as RichContext;

      let postAngle: PostAngle;

      if (job.postAngleIndex !== undefined && job.postAngleIndex !== null) {
        const extractPostAngle = richContext.post_angles.filter(angle => angle.sequence === job.postAngleIndex)[0];
        // Explicit index — use the specified angle
        if (job.postAngleIndex < 0 || !extractPostAngle) {
          throw new Error(
            `PostAngle at index ${job.postAngleIndex} does not exist in rich_context.post_angles ` +
            `(length ${richContext.post_angles.length}) for transcript ID ${job.transcriptId}`
          );
        }
        console.log(extractPostAngle);
        postAngle = extractPostAngle;
      } else {
        // AutoGeneration — select angle with highest score; lowest index on tie
        postAngle = richContext.post_angles.reduce((best: PostAngle, current: PostAngle, idx: number) => {
          const bestIdx = richContext.post_angles.indexOf(best);
          if (current.score > best.score) return current;
          if (current.score === best.score && idx < bestIdx) return current;
          return best;
        });
      }

      // ── Step 4: Resolve tone ──────────────────────────
      // Priority: userToneId (DB) > tonePreset (shared constant) > toneCustom (raw string) > undefined
      await this.updateProgress(job.id, 35, "Fetching user tone preferences");

      let userSavedTone: string | undefined;

      if (job.userToneId) {
        // Saved custom tone — fetch tone_prompt from DB
        const { data: toneRow, error: toneError } = await supabase
          .from("user_tone")
          .select("tone_prompt")
          .eq("id", job.userToneId)
          .single();

        if (toneError || !toneRow) {
          logger.warn("User tone not found — proceeding without tone", {
            workerId: this.workerId,
            jobId: job.id,
            userToneId: job.userToneId,
            error: toneError?.message,
          });
        } else {
          userSavedTone = toneRow.tone_prompt;
        }
      } else if (job.tonePreset) {
        // Built-in preset — resolve from shared constant map (no DB hit)
        const preset = TONE_PRESET_MAP[job.tonePreset as keyof typeof TONE_PRESET_MAP];
        if (preset) {
          userSavedTone = preset.toneInstruction;
          logger.debug("Resolved tone preset", { preset: job.tonePreset, workerId: this.workerId });
        } else {
          logger.warn("Unknown tone preset — proceeding without tone", {
            workerId: this.workerId,
            jobId: job.id,
            tonePreset: job.tonePreset,
          });
        }
      } else if (job.toneCustom) {
        // Raw custom string from textarea — use directly
        userSavedTone = job.toneCustom;
        logger.debug("Using custom tone string", { workerId: this.workerId, jobId: job.id });
      }
      // else: no tone — prompts use their built-in defaults

      // ── Step 5: Generate content via AI Service ───────────
      await this.updateProgress(job.id, 50, "Generating content with AI");

      // Deduct credits before generation (pro: generation cost; free: generation counter)
      const userPlan = await getUserActivePlan(job.userId);
      const generationCost = computeTotalCost(
        userPlan,
        job.platform.toLowerCase(),
        job.xPostFormat,
        0,           // duration already charged at video submission; pass 0 here
        true,        // treat as cached so only generation cost is charged
      );
      userPlanForRestore = userPlan;
      generationCostForRestore = generationCost;
      await deductCredits(job.userId, generationCost, userPlan);

      const result = await aiService.generateContent({
        postAngle,
        videoSummary: richContext.video_summary,
        platform: job.platform.toLowerCase() as Platforms,
        language: job.outputLang,
        userSavedTone,
        xPostFormat: job.xPostFormat,
      }, {
        userTier,
        enableFallback: env.MODEL_FALLBACK,
        forceModel: 'gemini'
      });

      // ── Step 6: Save to generations table ─────────────
      await this.updateProgress(job.id, 85, "Saving generated content");

      const { data: generation, error: genError } = await supabase
        .from("generations")
        .insert({
          payload_id: job.payloadId,
          user_id: job.userId,
          session_id: job.sessionId,
          platform: job.platform,
          lang: job.outputLang,
          content: result.content,
          model_used: result.modelUsed,
          token_usage: result.tokenUsage,
          status: "completed",
        })
        .select("id")
        .single();

      if (genError || !generation) {
        throw new Error(`Failed to save generation: ${genError?.message}`);
      }

      // Log post_generation credit event
      await logCreditEvent({
        user_id: job.userId,
        yt_id: transcriptRow.yt_id,
        event_type: "post_generation",
        platform: job.platform.toLowerCase(),
        x_format: job.xPostFormat ?? null,
        credits_charged: generationCost,
        video_duration_minutes: null,
        was_cached: false,
        generation_id: generation.id,
      });

      // ── Step 7: Update generation_id on queue row ─────
      await supabase
        .from("generation_queue")
        .update({ generation_id: generation.id })
        .eq("id", job.id);

      // ── Step 8: Complete ───────────────────────────────
      await this.updateProgress(job.id, 100, "Generation completed");
      await this.updateJobStatus(job.id, { status: "completed" });
      await this.logJobEvent(job.id, "completed", "Content generated successfully");

      logger.info("Generation job completed", {
        workerId: this.workerId,
        jobId: job.id,
        generationId: generation.id,
        platform: job.platform,
        tokenUsage: result.tokenUsage,
      });

      // ── Step 9: Send notification ──────────────────────
      await this.sendNotification(job.userId, job.id, {
        platform: job.platform,
        generationId: generation.id,
      });
    } catch (error) {
      logger.error("Generation job failed", {
        workerId: this.workerId,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Restore credits if deduction already happened
      if (userPlanForRestore) {
        await restoreCredits(job.userId, generationCostForRestore, userPlanForRestore);
      }

      await this.handleJobError(job, error as Error);
    } finally {
      this.currentJobId = null;
    }
  }

  // ── Private helpers ──────────────────────────────────────

  private async sendNotification(
    userId: string,
    jobId: string,
    result: { platform: Platforms; generationId: string }
  ): Promise<void> {
    try {
      if (!this.notificationService) return;

      const { data: job } = await supabase
        .from("generation_queue")
        .select("session_id")
        .eq("id", jobId)
        .single();

      if (!job) return;

      await this.notificationService.sendJobNotification({
        userId,
        jobId,
        sessionId: job.session_id,
        status: "completed",
        platform: result.platform,
        generationId: result.generationId,
      });
    } catch (error) {
      logger.error("Error sending notification", {
        userId,
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw — notification failure shouldn't fail the job
    }
  }

  private async updateJobStatus(
    jobId: string,
    updates: { status?: string; processingStartedAt?: Date; errorMessage?: string }
  ): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.status) updateData.status = updates.status;
    if (updates.processingStartedAt) updateData.processing_started_at = updates.processingStartedAt.toISOString();
    if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;

    const { error } = await supabase
      .from("generation_queue")
      .update(updateData)
      .eq("id", jobId);

    if (error) {
      logger.error("Failed to update job status", { jobId, error: error.message });
      throw error;
    }
  }

  private async updateProgress(jobId: string, progress: number, currentStep: string): Promise<void> {
    await supabase
      .from("generation_queue")
      .update({
        metadata: { progress, currentStep, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    logger.debug("Job progress updated", { jobId, progress, currentStep });
  }

  private async logJobEvent(jobId: string, eventType: string, message: string, errorDetails?: unknown): Promise<void> {
    try {
      await supabase.from("job_logs").insert({
        job_id: jobId,
        job_type: "generation",
        event_type: eventType,
        message,
        error_details: errorDetails || null,
        worker_id: this.workerId,
      });
    } catch (error) {
      logger.error("Failed to log job event", { jobId, eventType, error });
    }
  }

  private async handleJobError(job: GenerationQueueJob, error: Error): Promise<void> {
    await this.errorHandler.handleJobError(
      { ...job, type: "generation", queue: QUEUE_NAMES.GENERATION },
      error,
    );
  }
}
