import { env, validateEnv } from "./utils/env.js";
import { initSentry } from "./lib/sentry.js";
import app from "./app.js";
import { queueManager } from "./queue/index.js";
import { logger } from "./lib/logger.js";

// ── Validate env vars early ──────────────────────────────
validateEnv();

// ── Initialize Sentry (before anything else) ─────────────
initSentry();

// ── Initialize Queue Manager ─────────────────────────────
async function initializeQueue() {
  try {
    
    await queueManager.initialize({
      connectionString: env.DATABASE_URL,
      schema: env.PGBOSS_SCHEMA,
      retryLimit: env.QUEUE_MAX_ATTEMPTS,
      retryDelay: env.QUEUE_RETRY_DELAYS[0],
      retryBackoff: true,
      expireInSeconds: env.PGBOSS_EXPIRE_IN_SECONDS,
      retentionDays: env.PGBOSS_RETENTION_DAYS,
      maintenanceIntervalSeconds: env.PGBOSS_MAINTENANCE_INTERVAL_SECONDS,
      deleteAfterDays: env.PGBOSS_DELETE_AFTER_DAYS,
    });
    logger.info("✅ Queue system initialized successfully");
  } catch (error) {
    logger.error("❌ Failed to initialize queue system", { error });
    throw error;
  }
}

// ── Start application ────────────────────────────────────
async function startServer() {
  // Initialize queue before starting server
  await initializeQueue();

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running in ${env.NODE_ENV} mode`);
    console.log(`🔗 http://localhost:${env.PORT}`);
  });

  // ── Graceful shutdown ────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n⚡ ${signal} received — shutting down gracefully…`);
    
    // Stop queue manager first
    try {
      await queueManager.stop();
      logger.info("✅ Queue manager stopped");
    } catch (error) {
      logger.error("❌ Error stopping queue manager", { error });
    }

    // Close HTTP server
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error("⚠️  Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // ── Unhandled errors (global safety net) ─────────────────
  process.on("unhandledRejection", (reason) => {
    logger.error("💥 Unhandled Rejection", { reason });
  });

  process.on("uncaughtException", (error) => {
    logger.error("💥 Uncaught Exception", { error });
    process.exit(1);
  });
}

// Start the server
startServer().catch((error) => {
  logger.error("💥 Failed to start server", { error });
  process.exit(1);
});
