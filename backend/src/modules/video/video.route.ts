import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../../lib/logger.js";
import { PayloadSchema } from "./video.schema.js";
import { savePayloads } from "../db/db.payloads.js";
import { supabase } from "../../lib/supabase.js";
import { extractVideoId } from "../../services/youtube.service.js";
import { getOrFetchTranscript } from "../db/db.transcript.js";
import {
  getUserActivePlan,
  validatePlatformSupport,
  validateFreeUserRequest,
  validateProUserRequest,
  computeTotalCost,
} from "../../services/credits/creditEnforcement.service.js";
import { logCreditEvent, deductCredits } from "../../services/credits/creditLedger.service.js";
import { calculateVideoProcessingCost } from "@creatorjot/shared";
import { AppError } from "../../middleware/error.middleware.js";
import { jobManagementService } from "../../queue/JobManagementService.js";
import z from "zod";
import type { RichContext } from "../../types/index.js";

// ── Create the router ───────────────────────────────────
const videoRouter = Router();

// ── GET /video/:transcriptId/preview-headings ───────────
// Returns hooks from post_angles where score > 7, with their array index.
//
// Response:
//   200 → { transcriptId, headings: [{ post_angle_index: number, hook: string }] }
//   202 → { status: "processing" } when rich_context_extracted_at is null
//   404 → { error: "NotFound", message: "..." }
//   500 → { error: "InternalServerError", message: "..." }
videoRouter.get(
  "/:transcriptId/preview-headings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transcriptId } = req.params;

      const { data: transcript, error } = await supabase
        .from("transcript")
        .select("id, rich_context, rich_context_extracted_at")
        .eq("id", transcriptId)
        .eq("user_id", req.user!.id)
        .single();

      if (error || !transcript) {
        res.status(404).json({
          error: "NotFound",
          message: "Transcript not found",
          status: 404,
        });
        return;
      }

      if (!transcript.rich_context_extracted_at) {
        res.status(202).json({ status: "processing" });
        return;
      }

      const richContext = transcript.rich_context as RichContext;
      const headings = richContext.post_angles
        .map((angle, index) => ({
          post_angle_index: index,
          score: angle.score,
          hook: angle.hook,
        }))
        .filter((item) => item.score > 7)
        .map(({ post_angle_index, hook }) => ({ post_angle_index, hook }));

      res.status(200).json({ transcriptId, headings });
    } catch (error) {
      next(error);
    }
  },
);

// ── GET /hooks/:ytId ────────────────────────────────────
// Returns all post angles (hooks) for a given youtube video id
//
// Response:
//   200 → { ytId, hooks: [{ category, core_insight, hook, score }] }
//   202 → { status: "processing" }
//   404 → { error: "NotFound", message: "..." }
//   500 → { error: "InternalServerError", message: "..." }
videoRouter.get(
  "/hooks/:ytId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ytId } = req.params;

      const { data: transcript, error } = await supabase
        .from("transcript")
        .select("id, rich_context, rich_context_extracted_at")
        .eq("yt_id", ytId)
        .eq("user_id", req.user!.id)
        .single();

      if (error || !transcript) {
        res.status(404).json({
          error: "NotFound",
          message: "Transcript not found",
          status: 404,
        });
        return;
      }

      if (!transcript.rich_context_extracted_at) {
        res.status(202).json({ status: "processing" });
        return;
      }

      const richContext = transcript.rich_context as RichContext;
      const hooks = richContext.post_angles || [];

      res.status(200).json({ ytId, hooks });
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /video ─────────────────────────────────────────
// Submit a YouTube URL for processing.
//
// Request body:
//   {
//     "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
//     "output_lang": "en",
//     "user_tone_id": "uuid-or-null",
//     "settings": {}
//   }
//
// Response:
//   201 → { message: "Video queued for processing", payload_id, session_id, job_id }
//   400 → { error: "ValidationError", message: "..." }
//   500 → { error: "InternalServerError", message: "..." }
// ── POST /video handler flow ────────────────────────────────
//
// Step 1: Validate request body against PayloadSchema (Zod)
// Step 2: Extract YouTube video ID from the submitted URL
// Step 3: Resolve session — use the provided session if active, or create a new one
// Step 4: Save the payload record to the `payloads` table
// Step 5: Check transcript cache (DB) — use cached data if present, otherwise
//         fetch from external API and save to DB + storage
// Step 5b: Check video duration against tier limit — return 422 if exceeded
//          (transcript is already saved; AI processing is blocked for this tier)
// Step 6: Enqueue a transcript job to `transcript-queue` if the transcript
//         does not yet have an AI summary (Gemini processing)
// Step 7: If `auto_generate` is set and platforms are specified, enqueue
//         generation jobs to `generation-queue` for each platform (Claude)
//         after checking per-platform user quota
// Step 8: Return 201 with payload_id, session_id, transcript info, and job IDs
videoRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ── Step 1: Validate request body ──────────────────
      const parsed = PayloadSchema.safeParse(req.body);

      if (!parsed.success) {
        logger.warn("Validation failed for POST /api/v1/videos", {
          errors: z.treeifyError(parsed.error).errors,
        });
        res.status(400).json({
          error: "ValidationError",
          message: "Invalid request body",
          status: 400,
          details: z.treeifyError(parsed.error).properties,
        });
        return;
      }

      // ── Step 2: Extract YouTube video ID ───────────────
      const extractedId = extractVideoId(parsed.data.url);
      if (!extractedId) {
        res.status(400).json({
          error: "ValidationError",
          message: "Could not extract YouTube video ID from URL",
          status: 400,
        });
        return;
      }

      // ── Step 3: Validate or create session ────────────
      let sessionId: string;

      if (parsed.data.sessionId) {
        const { data: existingSession } = await supabase
          .from("sessions")
          .select("id, status")
          .eq("user_id", req.user!.id)
          .eq("id", parsed.data.sessionId)
          .limit(1)
          .single();

        if (!existingSession) {
          res.status(404).json({
            error: "SessionNotFound",
            message: "Session not found. Please create a session first.",
            status: 404,
          });
          return;
        }

        if (existingSession.status !== "active") {
          logger.error("Current session is not active", {
            sessionId: existingSession.id,
            status: existingSession.status,
          });
          res.status(403).json({
            error: "SessionInactive",
            message:
              "Your current session is not active. Please start a new session or activate the current one.",
            status: 403,
          });
          return;
        }

        sessionId = existingSession.id;
        logger.debug("Using existing session", { sessionId });
      } else {
        // No sessionId provided — create a new one
        const { data: newSession, error: sessionError } = await supabase
          .from("sessions")
          .insert({ user_id: req.user!.id, status: "active", pin: false })
          .select("id")
          .single();

        if (sessionError || !newSession) {
          logger.error("Failed to create session", { error: sessionError });
          res.status(500).json({
            error: "InternalServerError",
            message: "Failed to create session",
            status: 500,
          });
          return;
        }

        sessionId = newSession.id;
        logger.debug("Created new session", { sessionId });
      }

      // ── Step 4: Save payload to database ───────────────
      const payloadId = await savePayloads({
        payloads: {
          user_id: req.user!.id,
          session_id: sessionId,
          input_type: "youtube",
          yt_id: extractedId,
          output_lang: parsed.data.output_lang,
          user_tone_id: parsed.data.user_tone_id,
          settings: parsed.data.settings,
        },
      });

      if (!payloadId) {
        res.status(500).json({
          error: "InternalServerError",
          message: "Failed to save payload - validation or database error",
          status: 500,
        });
        return;
      }

      logger.info("Payload saved successfully", { payloadId });

      // ── Step 5: Get or fetch transcript ────────────────
      // Check cache first so we can report `cached: true/false` in the response,
      // then use getOrFetchTranscript which handles the full cache-or-fetch pattern:
      // returns cached data if present, otherwise fetches from the external
      // API, persists it, and returns the saved record. Throws on failure.
      const transcriptData = await getOrFetchTranscript(extractedId);

      // ── Step 5b: Credit enforcement ────────────────────
      // Fetch plan, validate platform/duration/credits, log video processing event.
      const userPlan = await getUserActivePlan(req.user!.id);
      const userTier = userPlan.plan_type === "free" ? "free" : "paid";
      const durationMinutes = Number(transcriptData.duration) / 60;
      const isVideoCached = transcriptData.is_cached ?? false;

      const autoGenerate = parsed.data.settings?.auto_generate === true;
      const platforms = parsed.data.settings?.platforms ?? [];
      const xPostFormat = parsed.data.settings?.x_post_format;

      // Validate each requested platform and enforce plan limits
      if (autoGenerate && platforms.length > 0) {
        for (const platform of platforms) {
          validatePlatformSupport(platform);
        }

        if (userPlan.plan_type === "free") {
          // Free users can only submit x/short — validate against the first (and only valid) platform
          validateFreeUserRequest(
            userPlan,
            platforms[0],
            xPostFormat,
            durationMinutes,
          );
        } else {
          // Pro: sum generation costs across ALL platforms; video processing cost charged once
          let totalGenerationCost = 0;
          for (const platform of platforms) {
            const fmt = platform === "x" ? xPostFormat : undefined;
            totalGenerationCost += computeTotalCost(
              userPlan,
              platform,
              fmt,
              0,
              true,
            );
          }
          const videoCost = isVideoCached
            ? 0
            : calculateVideoProcessingCost(durationMinutes);
          validateProUserRequest(
            userPlan,
            videoCost + totalGenerationCost,
            durationMinutes,
          );
        }
      } else if (!autoGenerate) {
        // No generation requested — still enforce duration limits
        if (userPlan.plan_type === "free" && durationMinutes > 10) {
          throw new AppError(
            "Videos longer than 10 minutes require a Pro plan.",
            400,
          );
        } else if (userPlan.plan_type === "pro" && durationMinutes > 90) {
          throw new AppError(
            "Videos longer than 90 minutes are not supported.",
            400,
          );
        }
      }

      // Log video_processing event (free users: 0 credits; pro: cost if not cached)
      const videoProcessingCost =
        userPlan.plan_type === "pro" && !isVideoCached
          ? calculateVideoProcessingCost(durationMinutes)
          : 0;

      await logCreditEvent({
        user_id: req.user!.id,
        yt_id: extractedId,
        event_type: "video_processing",
        platform: null,
        x_format: null,
        credits_charged: videoProcessingCost,
        video_duration_minutes: durationMinutes,
        was_cached: isVideoCached,
        generation_id: null,
      });

      // Deduct video processing credits from user_active_plan so the
      // payments page reflects the true total (video + generation credits).
      if (videoProcessingCost > 0) {
        await deductCredits(req.user!.id, videoProcessingCost, userPlan);
      }

      // ── Step 6: Intelligent Queue Management ───────────
      logger.info("User plan determined", {
        userId: req.user!.id,
        userTier,
        planType: userPlan.plan_type,
      });

      // Check if AI summary exists
      const hasAISummary = transcriptData.has_rich_context;

      let transcriptJobId: string | null = null;
      const generationJobs: Array<{ platform: string; job_id: string }> = [];

      if (!hasAISummary) {
        // ── Step 6a: Transcript needs AI processing ───────
        // Collect generation job params to pass into the transcript job.
        // The worker will enqueue them after completion.
        const pendingGenerationJobs: import("../../queue/types.js").PendingGenerationJob[] =
          [];

        if (autoGenerate && platforms.length > 0) {
          for (const platform of platforms) {
            pendingGenerationJobs.push({
              userId: req.user!.id,
              transcriptId: transcriptData.transcript_id,
              payloadId: payloadId,
              sessionId: sessionId,
              platform: platform as any,
              outputLang: parsed.data.output_lang,
              userToneId: parsed.data.user_tone_id || undefined,
              userTier: userTier,
              xPostFormat: platform === "x" ? xPostFormat : undefined,
              postAngleIndex: parsed.data.settings?.selected_hook_index,
            });
          }
        }

        const transcriptJobResult =
          await jobManagementService.enqueueTranscriptJob({
            userId: req.user!.id,
            ytId: extractedId,
            sessionId: sessionId,
            userTier: userTier,
            pendingGenerationJobs,
          });

        if (transcriptJobResult.success) {
          transcriptJobId = transcriptJobResult.jobId || null;
          logger.info("Transcript job enqueued", {
            jobId: transcriptJobId,
            yt_id: extractedId,
            pendingGenerationCount: pendingGenerationJobs.length,
          });
        }
      } else if (autoGenerate && platforms.length > 0) {
        // ── Step 7: AI summary exists — enqueue generation jobs directly ──
        logger.info("AI summary exists, enqueuing generation jobs directly", {
          platforms,
          transcriptId: transcriptData.transcript_id,
        });

        for (const platform of platforms) {
          const generationResult =
            await jobManagementService.enqueueGenerationJob({
              userId: req.user!.id,
              transcriptId: transcriptData.transcript_id,
              payloadId: payloadId,
              sessionId: sessionId,
              platform: platform as any,
              outputLang: parsed.data.output_lang,
              userToneId: parsed.data.user_tone_id || undefined,
              userTier: userTier,
              xPostFormat: platform === "x" ? xPostFormat : undefined,
              postAngleIndex: parsed.data.settings?.selected_hook_index,
            });

          if (generationResult.success && generationResult.jobId) {
            generationJobs.push({ platform, job_id: generationResult.jobId });
            logger.info("Generation job enqueued", {
              platform,
              jobId: generationResult.jobId,
              transcriptId: transcriptData.transcript_id,
            });
          } else {
            logger.error("Failed to enqueue generation job", {
              platform,
              error: generationResult.error,
              success: generationResult.success,
              jobId: generationResult.jobId,
            });
          }
        }
      } else {
        logger.debug("No generation jobs enqueued", {
          autoGenerate,
          platformsCount: platforms.length,
          hasAISummary,
          settingsRaw: parsed.data.settings,
        });
      }

      // ── Step 8: Respond with success ───────────────────
      res.status(201).json({
        message: "Video queued for processing",
        payload_id: payloadId,
        session_id: sessionId,
        transcript: {
          id: transcriptData.transcript_id,
          lang: transcriptData.lang,
          duration: transcriptData.duration,
          cached: transcriptData.is_cached,
          has_ai_summary: hasAISummary,
          ai_processing_job_id: transcriptJobId,
        },
        generation_jobs: generationJobs,
        queue_info: {
          transcript_job_queued: transcriptJobId !== null,
          generation_jobs_queued: generationJobs.length,
          total_jobs: (transcriptJobId ? 1 : 0) + generationJobs.length,
          generation_deferred:
            transcriptJobId !== null && autoGenerate && platforms.length > 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default videoRouter;
