// ═══════════════════════════════════════════════════════════
// 📁 /queue/QueueManager.ts — pg-boss Queue Manager
// ═══════════════════════════════════════════════════════════

import PgBoss from "pg-boss";
import type { PgBossConfig, PublishOptions, JobHandler } from "./types.js";
import { logger } from "../lib/logger.js";

// ── Queue Name Constants ───────────────────────────────────
export const QUEUE_NAMES = {
  TRANSCRIPT: "transcript-queue",
  GENERATION: "generation-queue",
} as const;

/**
 * QueueManager wraps pg-boss and provides a clean interface for
 * job queue operations across the application.
 */
export class QueueManager {
  private boss: PgBoss | null = null;
  private isInitialized = false;

  /**
   * Initialize the pg-boss instance with configuration
   */
  async initialize(config: PgBossConfig): Promise<void> {
    if (this.isInitialized) {
      logger.warn("QueueManager already initialized");
      return;
    }

    try {
      this.boss = new PgBoss({
        connectionString: config.connectionString,
        schema: config.schema || "pgboss",
        retryLimit: config.retryLimit,
        retryDelay: config.retryDelay,
        retryBackoff: config.retryBackoff,
        expireInSeconds: config.expireInSeconds,
        retentionDays: config.retentionDays,
        maintenanceIntervalSeconds: config.maintenanceIntervalSeconds,
        deleteAfterDays: config.deleteAfterDays,
        // Force IPv4 — Railway resolves Supabase hostnames to IPv6 by default
        // which is unreachable. family:4 tells pg to only use IPv4 addresses.
        db: {
          connectionString: config.connectionString,
          ssl: { rejectUnauthorized: false },
          family: 4,
        } as any,
      });

      await this.boss.start();
      this.isInitialized = true;

      logger.info("QueueManager initialized successfully", {
        schema: config.schema || "pgboss",
        retryLimit: config.retryLimit,
      });
    } catch (error) {
      logger.error("Failed to initialize QueueManager", { error });
      throw error;
    }
  }

  /**
   * Publish a job to a queue
   */
  async publish<T extends object = any>(
    queue: string,
    data: T,
    options?: PublishOptions
  ): Promise<string> {
    this.ensureInitialized();

    try {
      // Build options object, only including defined values
      const sendOptions: any = {};
      
      if (options?.priority !== undefined) {
        sendOptions.priority = options.priority;
      }
      if (options?.retryLimit !== undefined) {
        sendOptions.retryLimit = options.retryLimit;
      }
      if (options?.retryDelay !== undefined) {
        sendOptions.retryDelay = options.retryDelay;
      }
      if (options?.retryBackoff !== undefined) {
        sendOptions.retryBackoff = options.retryBackoff;
      }
      if (options?.expireInSeconds !== undefined) {
        sendOptions.expireInSeconds = options.expireInSeconds;
      }
      if (options?.singletonKey !== undefined) {
        sendOptions.singletonKey = options.singletonKey;
      }
      if (options?.startAfter !== undefined) {
        sendOptions.startAfter = options.startAfter;
      }

      const jobId = await this.boss!.send(queue, data, sendOptions);

      logger.debug("Job published to queue", {
        queue,
        jobId,
        priority: options?.priority,
      });

      return jobId!;
    } catch (error) {
      logger.error("Failed to publish job", { queue, error });
      throw error;
    }
  }

  /**
   * Subscribe to a queue and process jobs with the provided handler
   */
  async subscribe<T extends object = any>(
    queue: string,
    handler: JobHandler<T>,
    options?: { teamSize?: number; teamConcurrency?: number }
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await this.boss!.work(
        queue,
        {
          teamSize: options?.teamSize || 1,
          teamConcurrency: options?.teamConcurrency || 5,
        },
        async (job) => {
          try {
            await handler({ id: job.id, data: job.data as T });
          } catch (error) {
            logger.error("Job handler error", {
              queue,
              jobId: job.id,
              error,
            });
            throw error;
          }
        }
      );

      logger.info("Subscribed to queue", {
        queue,
        teamSize: options?.teamSize || 1,
        teamConcurrency: options?.teamConcurrency || 5,
      });
    } catch (error) {
      logger.error("Failed to subscribe to queue", { queue, error });
      throw error;
    }
  }

  /**
   * Mark a job as completed
   */
  async complete(jobId: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.boss!.complete(jobId);
      logger.debug("Job marked as completed", { jobId });
    } catch (error) {
      logger.error("Failed to check complete job", { jobId, error });
      throw error;
    }
  }

  /**
   * Mark a job as failed
   */
  async fail(jobId: string, error: Error): Promise<void> {
    this.ensureInitialized();

    try {
      await this.boss!.fail(jobId, error);
      logger.debug("Job marked as failed", { jobId, error: error.message });
    } catch (err) {
      logger.error("Failed to check fail job", { jobId, error: err });
      throw err;
    }
  }

  /**
   * Get the number of jobs in a queue by status
   */
  async getQueueSize(queue: string): Promise<number> {
    this.ensureInitialized();

    try {
      const size = await this.boss!.getQueueSize(queue);
      return size;
    } catch (error) {
      logger.error("Failed to get queue size", { queue, error });
      throw error;
    }
  }

  /**
   * Stop the queue manager and close connections
   */
  async stop(): Promise<void> {
    if (!this.isInitialized || !this.boss) {
      return;
    }

    try {
      await this.boss.stop();
      this.isInitialized = false;
      logger.info("QueueManager stopped successfully");
    } catch (error) {
      logger.error("Failed to stop QueueManager", { error });
      throw error;
    }
  }

  /**
   * Guards every public method against being called before `initialize()`.
   *
   * Design choice — throws instead of auto-initializing:
   *   Auto-initializing here would require async logic inside a synchronous
   *   guard, which forces every caller to await an implicit side-effect they
   *   didn't ask for. More importantly, initialization needs a `PgBossConfig`
   *   that only the application entry point (`src/server.ts`) has access to.
   *   Throwing makes the missing `initialize()` call immediately visible at
   *   startup rather than silently failing mid-request.
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.boss) {
      throw new Error("QueueManager not initialized. Call initialize() first.");
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
