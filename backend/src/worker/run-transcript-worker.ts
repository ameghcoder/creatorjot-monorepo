// ═══════════════════════════════════════════════════════════
// 📁 /worker/run-transcript-worker.ts — Transcript Worker Entry Point
// ═══════════════════════════════════════════════════════════

import { queueManager } from "../queue/QueueManager.js";
import { TranscriptWorker } from "./TranscriptWorker.js";
import { logger } from "../lib/logger.js";
import { env } from "../utils/env.js";
import { startHealthServer, setHealthStatus } from "./health-server.js";

/**
 * Entry point for running the transcript worker process.
 * 
 * This script:
 * 1. Initializes the queue manager
 * 2. Starts the transcript worker
 * 3. Handles graceful shutdown
 * 
 * Usage:
 *   tsx src/worker/run-transcript-worker.ts
 */

async function main() {
  try {
    logger.info("Starting Transcript Worker process");

    // Start health check server on Railway's assigned PORT
    startHealthServer("transcript-worker");

    // Initialize queue manager
    await queueManager.initialize({
      connectionString: env.DATABASE_URL,
      schema: "pgboss",
      retryLimit: 3,
      retryDelay: 1000,
      retryBackoff: true,
      expireInSeconds: 300,
      retentionDays: 90,
      maintenanceIntervalSeconds: 60,
      deleteAfterDays: 90,
    });

    // Create and start transcript worker
    const worker = new TranscriptWorker();
    await worker.start();

    // Mark as healthy
    setHealthStatus(true);

    logger.info("Transcript Worker is running");
  } catch (error) {
    logger.error("Failed to start Transcript Worker", {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Mark as unhealthy
    setHealthStatus(false);
    
    process.exit(1);
  }
}

// Start the worker
main();
