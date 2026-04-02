// ═══════════════════════════════════════════════════════════
// 📁 /worker/run-generation-worker.ts — Generation Worker Entry Point
// ═══════════════════════════════════════════════════════════

import { queueManager } from "../queue/QueueManager.js";
import { GenerationWorker } from "./GenerationWorker.js";
import { logger } from "../lib/logger.js";
import { env } from "../utils/env.js";
import {
  SSEServer,
  EmailClient,
  NotificationService,
} from "../notifications/index.js";
import { startHealthServer, setHealthStatus } from "./health-server.js";

/**
 * Entry point for running the generation worker process.
 * 
 * This script:
 * 1. Initializes the queue manager
 * 2. Initializes the notification service (WebSocket, SSE, Email)
 * 3. Starts the generation worker
 * 4. Handles graceful shutdown
 * 
 * Usage:
 *   tsx src/worker/run-generation-worker.ts
 */

async function main() {
  try {
    logger.info("Starting Generation Worker process");

    // Start health check server on Railway's assigned PORT
    startHealthServer("generation-worker");

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

    // Initialize notification service components
    const sseServer = new SSEServer();
    const emailClient = new EmailClient();

    emailClient.initialize();
    sseServer.initialize();

    // Create notification service (no WebSocket in worker context)
    const notificationService = new NotificationService(
      null,
      sseServer,
      emailClient
    );

    // Create and start generation worker with notification service
    const worker = new GenerationWorker(notificationService);
    await worker.start();

    // Mark as healthy
    setHealthStatus(true);

    logger.info("Generation Worker is running with notification service");
  } catch (error) {
    logger.error("Failed to start Generation Worker", {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Mark as unhealthy
    setHealthStatus(false);
    
    process.exit(1);
  }
}

// Start the worker
main();
