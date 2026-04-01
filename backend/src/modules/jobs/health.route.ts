// ═══════════════════════════════════════════════════════════
// 📁 /modules/jobs/health.route.ts — Health Check Endpoint
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import type { Request, Response } from "express";
import { queueManager } from "../../queue/QueueManager.js";
import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// ══════════════════════════════════════════════════════════
// GET /api/v1/health
// ══════════════════════════════════════════════════════════
// Health check endpoint for monitoring
//
// Requirements: 13.8, 18.1, 18.5, 18.6
// Must respond within 100ms
router.get("/", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const healthStatus: {
      status: "healthy" | "unhealthy";
      timestamp: string;
      checks: {
        database: { status: "up" | "down"; responseTime?: number };
        pgBoss: { status: "up" | "down"; responseTime?: number };
        workers: { status: "up" | "down"; message?: string };
      };
      queueStats?: {
        transcriptQueue: { pending: number; processing: number };
        generationQueue: { pending: number; processing: number };
      };
    } = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "down" },
        pgBoss: { status: "down" },
        workers: { status: "up" },
      },
    };

    // Check database connection
    const dbStartTime = Date.now();
    try {
      const { error } = await supabase.from("transcript_queue").select("id").limit(1);
      if (error) {
        healthStatus.checks.database.status = "down";
        healthStatus.status = "unhealthy";
      } else {
        healthStatus.checks.database.status = "up";
        healthStatus.checks.database.responseTime = Date.now() - dbStartTime;
      }
    } catch (error) {
      healthStatus.checks.database.status = "down";
      healthStatus.status = "unhealthy";
      logger.error("Database health check failed", { error });
    }

    // Check pg-boss connection
    const pgBossStartTime = Date.now();
    try {
      // Try to get queue size as a health check
      await queueManager.getQueueSize("transcript-queue");
      healthStatus.checks.pgBoss.status = "up";
      healthStatus.checks.pgBoss.responseTime = Date.now() - pgBossStartTime;
    } catch (error) {
      healthStatus.checks.pgBoss.status = "down";
      healthStatus.status = "unhealthy";
      logger.error("pg-boss health check failed", { error });
    }

    // Get queue statistics if database is up
    if (healthStatus.checks.database.status === "up") {
      try {
        const { data: transcriptStats } = await supabase
          .from("transcript_queue")
          .select("status")
          .in("status", ["pending", "processing"]);

        const { data: generationStats } = await supabase
          .from("generation_queue")
          .select("status")
          .in("status", ["pending", "processing"]);

        healthStatus.queueStats = {
          transcriptQueue: {
            pending: transcriptStats?.filter((r) => r.status === "pending").length || 0,
            processing: transcriptStats?.filter((r) => r.status === "processing").length || 0,
          },
          generationQueue: {
            pending: generationStats?.filter((r) => r.status === "pending").length || 0,
            processing: generationStats?.filter((r) => r.status === "processing").length || 0,
          },
        };
      } catch (error) {
        logger.error("Failed to get queue stats for health check", { error });
      }
    }

    // Check if workers are healthy (based on recent job processing)
    // A simple heuristic: if there are processing jobs, workers are active
    if (
      healthStatus.queueStats &&
      (healthStatus.queueStats.transcriptQueue.processing > 0 ||
        healthStatus.queueStats.generationQueue.processing > 0)
    ) {
      healthStatus.checks.workers.status = "up";
      healthStatus.checks.workers.message = "Workers are actively processing jobs";
    } else {
      // Check if there are pending jobs but no processing jobs (might indicate worker issue)
      if (
        healthStatus.queueStats &&
        (healthStatus.queueStats.transcriptQueue.pending > 10 ||
          healthStatus.queueStats.generationQueue.pending > 10)
      ) {
        healthStatus.checks.workers.status = "down";
        healthStatus.checks.workers.message = "Workers may be down - pending jobs not being processed";
        healthStatus.status = "unhealthy";
      }
    }

    const responseTime = Date.now() - startTime;

    // Log if response time exceeds 100ms
    if (responseTime > 100) {
      logger.warn("Health check exceeded 100ms target", { responseTime });
    }

    // Always return 200 — Railway uses this for deployment health checks.
    // Degraded state is visible in the response body but doesn't kill the deployment.
    return res.status(200).json(healthStatus);
  } catch (error) {
    logger.error("Health check failed", { error });
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

export default router;
