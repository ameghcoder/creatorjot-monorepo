/**
 * Stuck Job Detector — Entry Point
 *
 * Scans `transcript_queue` and `generation_queue` for jobs that have been
 * in `processing` status longer than STUCK_TIMEOUT_MINUTES, then resets
 * them to `pending` so they can be retried by the next worker poll.
 *
 * Designed to run on a schedule (e.g. every 5 minutes via Railway cron).
 *
 * Usage:
 *   tsx src/worker/run-stuck-detector.ts
 *   node dist/worker/run-stuck-detector.js
 */

import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { env } from "../utils/env.js";
import { startHealthServer, setHealthStatus } from "./health-server.js";

const STUCK_TIMEOUT_MINUTES = env.QUEUE_STUCK_JOB_TIMEOUT_MINUTES;

async function detectAndResetStuckJobs(
  tableName: "transcript_queue" | "generation_queue"
): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  // Fetch stuck jobs
  const { data: stuckJobs, error: fetchError } = await supabase
    .from(tableName)
    .select("id, attempts, max_attempts")
    .eq("status", "processing")
    .lt("updated_at", cutoff);

  if (fetchError) {
    logger.error(`Failed to fetch stuck jobs from ${tableName}`, { error: fetchError.message });
    return 0;
  }

  if (!stuckJobs || stuckJobs.length === 0) {
    return 0;
  }

  let resetCount = 0;

  for (const job of stuckJobs) {
    const newAttempts = (job.attempts ?? 0) + 1;
    const hasExceededMax = newAttempts >= (job.max_attempts ?? 3);

    const newStatus = hasExceededMax ? "failed" : "pending";
    const errorMessage = hasExceededMax
      ? `Permanently failed: exceeded max attempts after being stuck in processing for >${STUCK_TIMEOUT_MINUTES} minutes`
      : `Reset by stuck detector after >${STUCK_TIMEOUT_MINUTES} minutes in processing`;

    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        status: newStatus,
        attempts: newAttempts,
        error_message: errorMessage,
        processing_started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "processing"); // guard against race with worker completing the job

    if (updateError) {
      logger.error(`Failed to reset stuck job ${job.id}`, { error: updateError.message });
      continue;
    }

    // Log the event
    await supabase.from("job_logs").insert({
      job_id: job.id,
      job_type: tableName === "transcript_queue" ? "transcript" : "generation",
      event_type: hasExceededMax ? "failed" : "retry",
      message: errorMessage,
      error_details: { detector: "stuck-job-detector", timeoutMinutes: STUCK_TIMEOUT_MINUTES },
    });

    logger.warn(`Stuck job ${newStatus === "failed" ? "permanently failed" : "reset"}`, {
      jobId: job.id,
      table: tableName,
      attempts: newAttempts,
      maxAttempts: job.max_attempts,
      newStatus,
    });

    resetCount++;
  }

  return resetCount;
}

async function main() {
  logger.info("Stuck job detector starting", { timeoutMinutes: STUCK_TIMEOUT_MINUTES });

  // Start health server so Railway health checks pass
  startHealthServer("stuck-detector", 3004);
  setHealthStatus(true);

  const intervalMs = env.QUEUE_STUCK_JOB_DETECTION_INTERVAL_SECONDS * 1000;

  // Run immediately, then on interval
  const runDetection = async () => {
    const transcriptReset = await detectAndResetStuckJobs("transcript_queue");
    const generationReset = await detectAndResetStuckJobs("generation_queue");
    const total = transcriptReset + generationReset;
    logger.info("Stuck job detector completed", {
      transcriptJobsReset: transcriptReset,
      generationJobsReset: generationReset,
      total,
    });
  };

  await runDetection();
  setInterval(runDetection, intervalMs);

  logger.info("Stuck job detector running on interval", { intervalSeconds: env.QUEUE_STUCK_JOB_DETECTION_INTERVAL_SECONDS });
}

main().catch((err) => {
  logger.error("Stuck detector failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
