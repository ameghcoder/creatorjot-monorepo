import { logger } from "../lib/logger.js";

/**
 * Waits for the current job to complete or until the timeout is reached.
 *
 * @param getCurrentJobId - Function returning the current job ID (or null if idle)
 * @param onTimeout - Async callback invoked when the timeout is reached with a job still running
 * @param workerId - Worker identifier used for log context
 * @param timeout - Maximum milliseconds to wait before giving up
 */
export async function waitForJobCompletion(
  getCurrentJobId: () => string | null,
  onTimeout: (jobId: string) => Promise<void>,
  workerId: string,
  timeout: number
): Promise<void> {
  const startTime = Date.now();

  while (getCurrentJobId() && Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const jobId = getCurrentJobId();
  if (jobId) {
    logger.warn("Job did not complete within timeout, releasing job", {
      workerId,
      jobId,
      timeout,
    });

    await onTimeout(jobId);
  }
}

/**
 * Registers SIGTERM and SIGINT handlers that call the provided stop function
 * and exit the process cleanly.
 *
 * Call this once per worker after the worker has started subscribing to its queue.
 * Future workers should call this helper instead of re-implementing the pattern.
 *
 * @param stop - Async function that gracefully stops the worker
 * @param workerId - Worker identifier used for log context
 */
export function setupShutdownHandlers(
  stop: () => Promise<void>,
  workerId: string
): void {
  const shutdown = async (signal: string) => {
    logger.info("Received shutdown signal", { workerId, signal });
    await stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
