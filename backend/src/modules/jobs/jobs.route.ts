// ═══════════════════════════════════════════════════════════
// 📁 /modules/jobs/jobs.route.ts — Job Queue API Routes
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import type { Request, Response } from "express";
import { jobManagementService } from "../../queue/JobManagementService.js";
import { logger } from "../../lib/logger.js";
import { supabase } from "../../lib/supabase.js";
import type { XPostFormat } from "../../types/index.js";
import { getUserTier } from "../../utils/user.helpers.js";
import {
  getUserActivePlan,
  validatePlatformSupport,
  validateFreeUserRequest,
  validateProUserRequest,
  computeTotalCost,
} from "../../services/credits/creditEnforcement.service.js";

const router = Router();

// ══════════════════════════════════════════════════════════
// POST /api/v1/jobs/transcript
// ══════════════════════════════════════════════════════════
// Enqueue a transcript processing job
//
// Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 33.1
router.post("/transcript", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const { ytId, sessionId } = req.body;

    // Validate required fields
    if (!ytId || !sessionId) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Missing required fields: ytId, sessionId",
      });
    }

    // Get user tier
    const userTier = await getUserTier(userId);

    // Enqueue transcript job
    const result = await jobManagementService.enqueueTranscriptJob({
      userId,
      ytId,
      sessionId,
      userTier,
    });

    if (!result.success) {
      return res.status(500).json({
        error: "InternalServerError",
        message: result.error || "Failed to enqueue transcript job",
      });
    }

    logger.info("Transcript job enqueued via API", {
      userId,
      ytId,
      jobId: result.jobId,
    });

    return res.status(201).json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    logger.error("Failed to enqueue transcript job", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to enqueue transcript job",
    });
  }
});

// ══════════════════════════════════════════════════════════
// POST /api/v1/jobs/generation
// ══════════════════════════════════════════════════════════
// Enqueue a content generation job
//
// Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 10.1, 10.2, 10.3, 10.4, 10.5, 33.1
router.post("/generation", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const { transcriptId, payloadId, sessionId, platform, outputLang, userToneId, postAngleIndex, xPostFormat } = req.body;

    // Validate required fields
    if (!transcriptId || !payloadId || !sessionId || !platform || !outputLang) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Missing required fields: transcriptId, payloadId, sessionId, platform, outputLang",
      });
    }

    // Get user tier and enforce plan limits
    const userTier = await getUserTier(userId);
    const userPlan = await getUserActivePlan(userId);
    validatePlatformSupport(platform);
    const xFmt = platform === "x" ? (xPostFormat as string | undefined) : undefined;
    if (userPlan.plan_type === "free") {
      validateFreeUserRequest(userPlan, platform, xFmt, 0);
    } else {
      const cost = computeTotalCost(userPlan, platform, xFmt, 0, true);
      validateProUserRequest(userPlan, cost, 0);
    }

    // Enqueue generation job
    const result = await jobManagementService.enqueueGenerationJob({
      userId,
      transcriptId,
      payloadId,
      sessionId,
      platform,
      outputLang,
      userToneId,
      userTier,
      postAngleIndex: postAngleIndex != null ? Number(postAngleIndex) : undefined,
      xPostFormat: platform === "x" ? (xPostFormat as XPostFormat ?? "short") : undefined,
    });

    if (!result.success) {
      return res.status(500).json({
        error: "InternalServerError",
        message: result.error || "Failed to enqueue generation job",
      });
    }

    logger.info("Generation job enqueued via API", {
      userId,
      transcriptId,
      platform,
      jobId: result.jobId,
    });

    return res.status(201).json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    logger.error("Failed to enqueue generation job", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to enqueue generation job",
    });
  }
});

// ══════════════════════════════════════════════════════════
// POST /api/v1/jobs/generation/angle
// ══════════════════════════════════════════════════════════
// Enqueue an on-demand generation job for a specific PostAngle
// NOTE: Must be registered BEFORE /:jobId to avoid route conflicts
//
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
router.post("/generation/angle", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const { transcriptId, postAngleIndex, platform, outputLang, sessionId, payloadId, userToneId, xPostFormat } = req.body;

    // Validate required fields
    if (
      transcriptId == null ||
      postAngleIndex == null ||
      !platform ||
      !outputLang ||
      !sessionId ||
      !payloadId
    ) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Missing required fields: transcriptId, postAngleIndex, platform, outputLang, sessionId, payloadId",
      });
    }

    // Get user tier and enforce plan limits
    const userTier = await getUserTier(userId);
    const userPlan = await getUserActivePlan(userId);
    validatePlatformSupport(platform);
    const xFmt = platform === "x" ? (xPostFormat as string | undefined) : undefined;
    if (userPlan.plan_type === "free") {
      validateFreeUserRequest(userPlan, platform, xFmt, 0);
    } else {
      const cost = computeTotalCost(userPlan, platform, xFmt, 0, true);
      validateProUserRequest(userPlan, cost, 0);
    }

    // Enqueue generation job with the specified post angle index
    const result = await jobManagementService.enqueueGenerationJob({
      userId,
      transcriptId,
      payloadId,
      sessionId,
      platform,
      outputLang,
      userToneId,
      userTier,
      postAngleIndex: Number(postAngleIndex),
      xPostFormat: platform === "x" ? (xPostFormat as XPostFormat ?? "short") : undefined,
    });

    if (!result.success) {
      return res.status(500).json({
        error: "InternalServerError",
        message: result.error || "Failed to enqueue generation job",
      });
    }

    logger.info("On-demand angle generation job enqueued via API", {
      userId,
      transcriptId,
      platform,
      postAngleIndex: Number(postAngleIndex),
      jobId: result.jobId,
    });

    return res.status(201).json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    logger.error("Failed to enqueue on-demand angle generation job", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to enqueue generation job",
    });
  }
});

// ══════════════════════════════════════════════════════════
// POST /api/v1/jobs/batch
// ══════════════════════════════════════════════════════════
// Enqueue multiple generation jobs as a batch
//
// Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.7
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const { transcriptId, sessionId, payloadId, jobs } = req.body;

    // Validate required fields
    if (!transcriptId || !sessionId || !payloadId || !jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Missing required fields: transcriptId, sessionId, payloadId, jobs (array)",
      });
    }

    // Validate batch size
    if (jobs.length === 0) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Batch must contain at least one job",
      });
    }

    if (jobs.length > 10) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Batch size exceeds maximum of 10 jobs",
      });
    }

    // Validate each job in batch
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (!job.platform || !job.outputLang) {
        return res.status(400).json({
          error: "BadRequest",
          message: `Job at index ${i} is missing required fields: platform, outputLang`,
        });
      }
      if (job.platform === "x" && job.xPostFormat && !["short", "long", "thread"].includes(job.xPostFormat)) {
        return res.status(400).json({
          error: "BadRequest",
          message: `Job at index ${i} has invalid xPostFormat — must be "short", "long", or "thread"`,
        });
      }
    }

    // Get user tier and enforce plan limits for all jobs
    const userTier = await getUserTier(userId);
    const userPlan = await getUserActivePlan(userId);

    // Check quota for all jobs before enqueuing any
    for (const job of jobs) {
      validatePlatformSupport(job.platform);
    }
    if (userPlan.plan_type === "free") {
      // Free: validate the single allowed format (x/short)
      validateFreeUserRequest(userPlan, jobs[0].platform, jobs[0].xPostFormat, 0);
    } else {
      // Pro: sum generation costs across all jobs, validate total
      let totalCost = 0;
      for (const job of jobs) {
        const xFmt = job.platform === "x" ? (job.xPostFormat as string | undefined) : undefined;
        totalCost += computeTotalCost(userPlan, job.platform, xFmt, 0, true);
      }
      validateProUserRequest(userPlan, totalCost, 0);
    }

    // Enqueue batch
    const result = await jobManagementService.enqueueBatchGenerationJobs({
      userId,
      transcriptId,
      sessionId,
      jobs,
      userTier,
      payloadId: req.body.payloadId ?? "",
    });

    if (!result.success) {
      return res.status(500).json({
        error: "InternalServerError",
        message: result.error || "Failed to enqueue batch jobs",
      });
    }

    logger.info("Batch jobs enqueued via API", {
      userId,
      transcriptId,
      jobCount: result.jobIds?.length,
    });

    return res.status(201).json({
      success: true,
      jobIds: result.jobIds,
    });
  } catch (error) {
    logger.error("Failed to enqueue batch jobs", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to enqueue batch jobs",
    });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/v1/jobs/session/:sessionId
// ══════════════════════════════════════════════════════════
// Fetch all generations for a session, grouped by payload.
// Returns payloads with their associated generations (content + status).
router.get("/session/:sessionId", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
    }

    const { sessionId } = req.params;

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, name, status, created_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "NotFound", message: "Session not found" });
    }

    // Fetch all payloads for this session
    const { data: payloads, error: payloadsError } = await supabase
      .from("payloads")
      .select("id, yt_id, settings, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (payloadsError) {
      return res.status(500).json({ error: "InternalServerError", message: "Failed to fetch payloads" });
    }

    // Fetch all generations for this session
    const { data: generations, error: generationsError } = await supabase
      .from("generations")
      .select("id, payload_id, platform, lang, content, status, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (generationsError) {
      return res.status(500).json({ error: "InternalServerError", message: "Failed to fetch generations" });
    }

    // Fetch the yt_id from the first payload to get hooks
    const ytId = payloads?.[0]?.yt_id ?? null;

    // Group generations by payload_id
    const gensByPayload = new Map<string, typeof generations>();
    for (const gen of generations ?? []) {
      if (!gensByPayload.has(gen.payload_id)) gensByPayload.set(gen.payload_id, []);
      gensByPayload.get(gen.payload_id)!.push(gen);
    }

    const result = (payloads ?? []).map((p) => ({
      payload_id: p.id,
      yt_id: p.yt_id,
      settings: p.settings,
      created_at: p.created_at,
      generations: gensByPayload.get(p.id) ?? [],
    }));

    return res.status(200).json({
      session,
      yt_id: ytId,
      payloads: result,
    });
  } catch (error) {
    logger.error("Failed to fetch session generations", { error });
    return res.status(500).json({ error: "InternalServerError", message: "Failed to fetch session data" });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/v1/jobs/metrics
// ══════════════════════════════════════════════════════════
// Get queue metrics — admin only
//
// Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
// NOTE: This route must come before /:jobId to avoid route conflicts
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    // Restrict to admin users only
    const adminIds = (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!adminIds.includes(userId)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied",
      });
    }

    // Get queue metrics
    const metrics = await jobManagementService.getQueueMetrics();

    return res.status(200).json(metrics);
  } catch (error) {
    logger.error("Failed to get queue metrics", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to get queue metrics",
    });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/v1/jobs/generation/:generationId/content
// ══════════════════════════════════════════════════════════
// Fetch generated content by generation ID
// NOTE: Must come before /:jobId to avoid route conflicts
router.get("/generation/:generationId/content", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
    }

    const { generationId } = req.params;

    const { data, error } = await supabase
      .from("generations")
      .select("id, content, platform, lang, status, created_at")
      .eq("id", generationId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "NotFound", message: "Generation not found or access denied" });
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error("Failed to fetch generation content", { error });
    return res.status(500).json({ error: "InternalServerError", message: "Failed to fetch generation content" });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/v1/jobs/:jobId
// ══════════════════════════════════════════════════════════
// Get job status by ID
//
// Requirements: 25.3, 33.2, 33.3
router.get("/:jobId", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;

    if (!jobId) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Missing jobId parameter",
      });
    }

    // Get job status (verifies user ownership)
    const jobStatus = await jobManagementService.getJobStatus(jobId, userId);

    if (!jobStatus) {
      return res.status(404).json({
        error: "NotFound",
        message: "Job not found or access denied",
      });
    }

    return res.status(200).json(jobStatus);
  } catch (error) {
    logger.error("Failed to get job status", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to get job status",
    });
  }
});

// ══════════════════════════════════════════════════════════
// DELETE /api/v1/jobs/:jobId
// ══════════════════════════════════════════════════════════
// Cancel a job
//
// Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7
router.delete("/:jobId", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;

    if (!jobId) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Missing jobId parameter",
      });
    }

    // Cancel job (verifies user ownership)
    const cancelled = await jobManagementService.cancelJob(jobId, userId);

    if (!cancelled) {
      return res.status(404).json({
        error: "NotFound",
        message: "Job not found, already completed, or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    logger.error("Failed to cancel job", { error });
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to cancel job",
    });
  }
});

export default router;
