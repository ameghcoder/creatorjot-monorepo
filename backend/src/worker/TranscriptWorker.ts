// ═══════════════════════════════════════════════════════════
// 📁 /worker/TranscriptWorker.ts — Transcript Worker
// ═══════════════════════════════════════════════════════════

import { randomUUID } from "crypto";
import { queueManager, QUEUE_NAMES } from "../queue/QueueManager.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { transcriptExists } from "../modules/db/db.transcript.js";
import { ErrorHandler, QuotaExceededError } from "./ErrorHandler.js";
import { waitForJobCompletion, setupShutdownHandlers } from "./workerUtils.js";
import { generateRichContext } from "../services/ai/transcript.summarizer.js";
import { transcriptToCheckpoints } from "../utils/transcript.sentences.js";
import { getUserTier } from "../utils/user.helpers.js";
import { jobManagementService } from "../queue/JobManagementService.js";
import type { TranscriptStorageFile } from "../modules/storage/storage.saveTranscriptFile.js";
import type { TranscriptQueueJob } from "../queue/types.js";

import { AI_DURATION_LIMITS } from "../config/limit.js";

/**
 * TranscriptWorker processes transcript jobs from the transcript queue.
 * 
 * Responsibilities:
 * - Fetch transcripts from external API
 * - Store transcript files in storage
 * - Generate summaries using AI (Gemini)
 * - Extract key points from transcripts
 * - Save transcript data to database
 * - Track progress and handle errors
 * 
 * Requirements: 4.1, 4.2, 4.3, 18.1
 */
export class TranscriptWorker {
  private workerId: string;
  private isRunning: boolean = false;
  private currentJobId: string | null = null;
  private shutdownTimeout: number = 30000; // 30 seconds
  private errorHandler: ErrorHandler;

  constructor() {
    this.workerId = `transcript-worker-${randomUUID().slice(0, 8)}`;
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Start the worker and begin processing jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("TranscriptWorker already running", { workerId: this.workerId });
      return;
    }

    this.isRunning = true;
    logger.info("TranscriptWorker started", { workerId: this.workerId });

    // Log startup event
    await this.logWorkerEvent("startup", "Worker started");

    // Subscribe to transcript queue
    await queueManager.subscribe<TranscriptQueueJob>(
      QUEUE_NAMES.TRANSCRIPT,
      async (job) => {
        await this.processJob(job.data);
      },
      {
        teamSize: 1,
        teamConcurrency: 5,
      }
    );

    // Setup graceful shutdown handlers (shared utility — see workerUtils.ts)
    setupShutdownHandlers(() => this.stop(), this.workerId);
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info("TranscriptWorker stopping", { workerId: this.workerId });
    this.isRunning = false;

    // Wait for current job to complete or timeout
    if (this.currentJobId) {
      logger.info("Waiting for current job to complete", {
        workerId: this.workerId,
        jobId: this.currentJobId,
      });

      await waitForJobCompletion(
        () => this.currentJobId,
        (jobId) => this.updateJobStatus(jobId, { status: "pending", processingStartedAt: undefined }),
        this.workerId,
        this.shutdownTimeout
      );
    }

    // Log shutdown event
    await this.logWorkerEvent("shutdown", "Worker stopped");

    logger.info("TranscriptWorker stopped", { workerId: this.workerId });
  }

  /**
   * Process a single transcript job.
   *
   * Flow:
   *   1. Check transcript row exists in DB (must have been saved by the API route)
   *   2. Skip if rich_context_extracted_at is already set (idempotent)
   *   3. Check video duration against tier limit — fail permanently if exceeded
   *   4. Download the transcript JSON file from Supabase Storage
   *   5. Build checkpoints from the raw chunks (evenly-spaced time blocks)
   *   6. Call generateRichContext — single Gemini call, persists to DB internally
   *   7. Enqueue deferred generation jobs (if any)
   *   8. Mark job completed
   */
  async processJob(job: TranscriptQueueJob): Promise<void> {
    this.currentJobId = job.id;

    try {
      logger.info("Processing transcript job", {
        workerId: this.workerId,
        jobId: job.id,
        ytId: job.ytId,
        userId: job.userId,
        attempts: (job.attempts ?? 0) + 1,
      });

      await this.updateJobStatus(job.id, {
        status: "processing",
        processingStartedAt: new Date(),
      });
      await this.logJobEvent(job.id, "started", "Job processing started");

      // ── Step 1: Verify transcript row exists ───────────
      await this.updateProgress(job.id, 5, "Verifying transcript record");

      const transcriptRecord = await transcriptExists(job.ytId);

      if (!transcriptRecord.exists || !transcriptRecord.data) {
        // Transcript row not found — this job was enqueued before the row was
        // committed, or something went wrong upstream. Throw so ErrorHandler
        // retries it (the row should appear shortly).
        throw new Error(`Transcript record not found in DB for yt_id: ${job.ytId}`);
      }

      const record = transcriptRecord.data;

      // ── Step 2: Determine what needs to be generated ────
      const alreadyHasRichContext = !!record.rich_context_extracted_at;

      if (alreadyHasRichContext) {
        logger.info("Transcript already has rich context, skipping AI processing", {
          workerId: this.workerId,
          jobId: job.id,
          ytId: job.ytId,
        });
        await this.updateJobStatus(job.id, { status: "completed" });
        await this.logJobEvent(job.id, "completed", "Already complete — skipped");
        this.currentJobId = null;
        return;
      }

      // ── Step 3: Check duration limit ──────────────────
      // Transcript is always saved to storage regardless of tier.
      // AI processing (summary + key points) is gated by video length.
      await this.updateProgress(job.id, 12, "Checking duration limit");

      const userTier = await getUserTier(job.userId);
      const limitSeconds = AI_DURATION_LIMITS[userTier === "free" ? "free" : "paid"];
      const videoDuration = Number(record.duration); // numeric(10,2) from DB

      if (videoDuration > limitSeconds) {
        const limitMinutes = limitSeconds / 60;
        const videoMinutes = Math.round(videoDuration / 60);
        throw new QuotaExceededError(
          `Video is ${videoMinutes} min — exceeds the ${limitMinutes}-minute AI processing limit for ${userTier} plan. Transcript is saved; upgrade to process longer videos.`
        );
      }

      logger.debug("Duration limit check passed", {
        ytId: job.ytId,
        videoDuration,
        limitSeconds,
        userTier,
      });

      // ── Step 4: Download transcript file from storage ──
      await this.updateProgress(job.id, 15, "Downloading transcript from storage");

      const storageFile = await this.downloadTranscriptFile(record.url, job.ytId);

      // ── Step 4: Build checkpoints ──────────────────────
      // Use 20 checkpoints for videos > 10 min, 10 for shorter ones.
      // Checkpoints give Gemini a structured, time-aware view of the video
      // so key points are distributed across the full timeline.
      await this.updateProgress(job.id, 25, "Building transcript checkpoints");

      const durationMinutes = storageFile.roundDurationValue / 60;
      const checkpointCount = durationMinutes > 10 ? 20 : 10;
      const checkpoints = transcriptToCheckpoints(storageFile.transcript, checkpointCount);

      logger.debug("Transcript checkpoints built", {
        ytId: job.ytId,
        chunks: storageFile.transcript.length,
        checkpoints: checkpoints.length,
        durationMinutes: durationMinutes.toFixed(1),
      });

      // ── Step 5: Generate rich context, persist to DB ──────
      await this.updateProgress(job.id, 40, "Generating rich context with Gemini");
      const { richContext } = await generateRichContext(checkpoints, job.ytId);
      await this.updateProgress(job.id, 90, "Rich context saved to database");

      // ── Step 7: Enqueue deferred generation jobs ───────
      if (job.pendingGenerationJobs && job.pendingGenerationJobs.length > 0) {
        logger.info("Enqueuing deferred generation jobs after transcript completion", {
          jobId: job.id,
          ytId: job.ytId,
          count: job.pendingGenerationJobs.length,
        });

        for (const genJob of job.pendingGenerationJobs) {
          const result = await jobManagementService.enqueueGenerationJob(genJob);
          if (result.success) {
            logger.info("Deferred generation job enqueued", {
              platform: genJob.platform,
              jobId: result.jobId,
            });
          } else {
            logger.error("Failed to enqueue deferred generation job", {
              platform: genJob.platform,
              error: result.error,
            });
          }
        }
      }

      // ── Step 8: Complete ──────────────────────────────
      await this.updateProgress(job.id, 100, "AI processing completed");
      await this.updateJobStatus(job.id, { status: "completed" });
      await this.logJobEvent(job.id, "completed", "Rich context generated successfully");

      logger.info("Transcript job completed", {
        workerId: this.workerId,
        jobId: job.id,
        ytId: job.ytId,
        postAnglesCount: richContext.post_angles.length,
      });
    } catch (error) {
      logger.error("Transcript job failed", {
        workerId: this.workerId,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.handleJobError(job, error as Error);
    } finally {
      this.currentJobId = null;
    }
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Download and parse the transcript JSON file from Supabase Storage.
   *
   * The `url` column stores a relative path like `transcript/<filename>.json`.
   * We use the Supabase storage client to download it directly rather than
   * making an unauthenticated public HTTP request.
   */
  private async downloadTranscriptFile(
    relativeUrl: string,
    ytId: string
  ): Promise<TranscriptStorageFile> {
    // relativeUrl format: "transcript/<filename>.json"
    // Strip the bucket prefix to get just the file path within the bucket.
    const filePath = relativeUrl.replace(/^transcript\//, "");

    const { data, error } = await supabase.storage
      .from("transcript")
      .download(filePath);

    if (error || !data) {
      throw new Error(`Failed to download transcript file from storage: ${error?.message ?? "no data"}`);
    }

    const text = await data.text();

    try {
      const parsed = JSON.parse(text) as TranscriptStorageFile;

      if (!parsed.transcript || !Array.isArray(parsed.transcript)) {
        throw new Error("Transcript file missing 'transcript' array");
      }

      logger.debug("Transcript file downloaded", {
        ytId,
        chunks: parsed.transcript.length,
        duration: parsed.roundDurationValue,
      });

      return parsed;
    } catch (parseErr) {
      throw new Error(`Failed to parse transcript JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    updates: {
      status?: string;
      processingStartedAt?: Date;
      errorMessage?: string;
      attempts?: number;
    }
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status) {
      updateData.status = updates.status;
    }

    if (updates.processingStartedAt) {
      updateData.processing_started_at = updates.processingStartedAt.toISOString();
    }

    if (updates.errorMessage !== undefined) {
      updateData.error_message = updates.errorMessage;
    }

    if (updates.attempts !== undefined) {
      updateData.attempts = updates.attempts;
    }

    const { error } = await supabase
      .from("transcript_queue")
      .update(updateData)
      .eq("id", jobId);

    if (error) {
      logger.error("Failed to update job status", {
        jobId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update job progress in metadata
   */
  private async updateProgress(
    jobId: string,
    progress: number,
    currentStep: string
  ): Promise<void> {
    const { error } = await supabase
      .from("transcript_queue")
      .update({
        metadata: {
          progress,
          currentStep,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      logger.error("Failed to update job progress", {
        jobId,
        progress,
        currentStep,
        error: error.message,
      });
    }

    logger.debug("Job progress updated", {
      jobId,
      progress,
      currentStep,
    });
  }

  /**
   * Log job event to job_logs table
   */
  private async logJobEvent(
    jobId: string,
    eventType: string,
    message: string,
    errorDetails?: any
  ): Promise<void> {
    try {
      await supabase.from("job_logs").insert({
        job_id: jobId,
        job_type: "transcript",
        event_type: eventType,
        message,
        error_details: errorDetails || null,
        worker_id: this.workerId,
      });
    } catch (error) {
      logger.error("Failed to log job event", {
        jobId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Log worker event
   */
  private async logWorkerEvent(eventType: string, message: string): Promise<void> {
    logger.info("Worker event", {
      workerId: this.workerId,
      eventType,
      message,
    });
  }

  /**
   * Handle job error using ErrorHandler
   */
  private async handleJobError(job: TranscriptQueueJob, error: Error): Promise<void> {
    await this.errorHandler.handleJobError(
      {
        ...job,
        type: "transcript",
        queue: QUEUE_NAMES.TRANSCRIPT,
      },
      error,
    );
  }

}
