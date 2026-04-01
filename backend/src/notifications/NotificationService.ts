// ═══════════════════════════════════════════════════════════
// 📁 /notifications/NotificationService.ts — Notification Service
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Orchestrates notification delivery via WebSocket, SSE, and email.
//   Routes notifications based on user connection status.
//
// FEATURES:
//   ✅ Send job completion notifications
//   ✅ Send job failure notifications
//   ✅ Send batch completion notifications
//   ✅ Route to WebSocket/SSE if online, email if offline
//   ✅ Ensure exactly one notification per job
//   ✅ Track batch completion status
//
// REQUIREMENTS:
//   - 5.12: Trigger notification on job completion
//   - 9.1: Send real-time updates via WebSocket/SSE
//   - 9.2: Send email when user offline
//   - 9.3: Include job_id, status, platform
//   - 9.4: Send failure notifications
//   - 9.6: Include session_id
//   - 24.6: Send single notification for batch completion
// ═══════════════════════════════════════════════════════════

import { logger } from "../lib/logger.js";
import { WebSocketServer } from "./WebSocketServer.js";
import { SSEServer } from "./SSEServer.js";
import { EmailClient } from "./EmailClient.js";
import type {
  JobNotification,
  NotificationData,
  BatchNotification,
} from "./types.js";

export class NotificationService {
  private wsServer: WebSocketServer | null;
  private sseServer: SSEServer;
  private emailClient: EmailClient;
  private batchTracking: Map<
    string,
    {
      sessionId: string;
      userId: string;
      totalJobs: number;
      completedJobs: Set<string>;
      failedJobs: Set<string>;
    }
  > = new Map();

  constructor(
    wsServer: WebSocketServer | null,
    sseServer: SSEServer,
    emailClient: EmailClient,
  ) {
    this.wsServer = wsServer;
    this.sseServer = sseServer;
    this.emailClient = emailClient;
  }

  /**
   * Send job notification
   * Routes to WebSocket/SSE if user online, email if offline
   * @param notification Job notification data
   */
  async sendJobNotification(notification: JobNotification): Promise<void> {
    try {
      logger.info("Sending job notification", {
        userId: notification.userId,
        jobId: notification.jobId,
        status: notification.status,
      });

      // Create notification data
      const notificationData: NotificationData = {
        type:
          notification.status === "completed"
            ? "job_completed"
            : notification.status === "failed"
              ? "job_failed"
              : "job_cancelled",
        jobId: notification.jobId,
        sessionId: notification.sessionId,
        status: notification.status,
        platform: notification.platform,
        errorMessage: notification.errorMessage,
        generationId: notification.generationId,
        timestamp: new Date().toISOString(),
      };

      // Check if this is part of a batch
      const batchKey = `${notification.userId}-${notification.sessionId}`;
      if (this.batchTracking.has(batchKey)) {
        await this.handleBatchJobNotification(notification);
        return;
      }

      // Check user connection status
      const isOnline = this.getUserConnectionStatus(notification.userId);

      if (isOnline) {
        // User is online - send via WebSocket or SSE
        const sentViaWS = this.wsServer
          ? await this.wsServer.broadcast(notification.userId, notificationData)
          : false;

        if (!sentViaWS) {
          // Try SSE as fallback
          const sentViaSSE = await this.sseServer.broadcast(
            notification.userId,
            notificationData,
          );

          if (!sentViaSSE) {
            // User disconnected between check and send - send email
            await this.sendEmailNotification(notification);
          }
        }
      } else {
        // User is offline - send email
        await this.sendEmailNotification(notification);
      }

      logger.info("Job notification sent", {
        userId: notification.userId,
        jobId: notification.jobId,
        online: isOnline,
      });
    } catch (error) {
      logger.error("Error sending job notification", {
        error,
        notification,
      });
    }
  }

  /**
   * Send batch notification
   * @param notification Batch notification data
   */
  async sendBatchNotification(
    notification: BatchNotification,
  ): Promise<void> {
    try {
      logger.info("Sending batch notification", {
        userId: notification.userId,
        sessionId: notification.sessionId,
        totalJobs: notification.totalCount,
      });

      const notificationData: NotificationData = {
        type: "batch_completed",
        jobId: notification.jobIds[0], // Use first job ID
        sessionId: notification.sessionId,
        status: "completed",
        timestamp: new Date().toISOString(),
      };

      // Check user connection status
      const isOnline = this.getUserConnectionStatus(notification.userId);

      if (isOnline) {
        // Send via WebSocket or SSE
        const sentViaWS = this.wsServer
          ? await this.wsServer.broadcast(notification.userId, notificationData)
          : false;

        if (!sentViaWS) {
          await this.sseServer.broadcast(notification.userId, notificationData);
        }
      } else {
        // User offline - email will be sent via batching in EmailClient
        logger.debug("User offline, batch email will be sent", {
          userId: notification.userId,
        });
      }
    } catch (error) {
      logger.error("Error sending batch notification", { error, notification });
    }
  }

  /**
   * Register a batch of jobs for tracking
   * @param sessionId Session ID
   * @param userId User ID
   * @param jobIds Array of job IDs in the batch
   */
  registerBatch(sessionId: string, userId: string, jobIds: string[]): void {
    const batchKey = `${userId}-${sessionId}`;

    this.batchTracking.set(batchKey, {
      sessionId,
      userId,
      totalJobs: jobIds.length,
      completedJobs: new Set(),
      failedJobs: new Set(),
    });

    logger.info("Batch registered for tracking", {
      sessionId,
      userId,
      jobCount: jobIds.length,
    });
  }

  /**
   * Handle notification for a job that's part of a batch
   */
  private async handleBatchJobNotification(
    notification: JobNotification,
  ): Promise<void> {
    const batchKey = `${notification.userId}-${notification.sessionId}`;
    const batch = this.batchTracking.get(batchKey);

    if (!batch) {
      // Batch not found, send individual notification
      logger.warn("Batch not found for job", {
        jobId: notification.jobId,
        sessionId: notification.sessionId,
      });
      return;
    }

    // Track job completion/failure
    if (notification.status === "completed") {
      batch.completedJobs.add(notification.jobId);
    } else if (notification.status === "failed") {
      batch.failedJobs.add(notification.jobId);
    }

    // Check if all jobs in batch are done
    const totalDone = batch.completedJobs.size + batch.failedJobs.size;

    if (totalDone === batch.totalJobs) {
      // All jobs done - send batch notification
      await this.sendBatchNotification({
        userId: batch.userId,
        sessionId: batch.sessionId,
        jobIds: Array.from(batch.completedJobs).concat(
          Array.from(batch.failedJobs),
        ),
        completedCount: batch.completedJobs.size,
        failedCount: batch.failedJobs.size,
        totalCount: batch.totalJobs,
      });

      // Clean up batch tracking
      this.batchTracking.delete(batchKey);

      logger.info("Batch completed", {
        sessionId: batch.sessionId,
        completed: batch.completedJobs.size,
        failed: batch.failedJobs.size,
      });
    } else {
      logger.debug("Batch job completed, waiting for others", {
        sessionId: batch.sessionId,
        done: totalDone,
        total: batch.totalJobs,
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: JobNotification,
  ): Promise<void> {
    if (notification.status === "completed") {
      await this.emailClient.sendJobCompletionEmail(
        notification.userId,
        notification.jobId,
        notification.platform!,
        notification.generationId,
      );
    } else if (notification.status === "failed") {
      await this.emailClient.sendJobFailureEmail(
        notification.userId,
        notification.jobId,
        notification.platform,
        notification.errorMessage || "Unknown error",
      );
    }
  }

  /**
   * Check if user is currently connected (WebSocket or SSE)
   * @param userId User ID
   * @returns True if user has active connections
   */
  getUserConnectionStatus(userId: string): boolean {
    return (
      (this.wsServer?.isUserConnected(userId) ?? false) ||
      this.sseServer.isUserConnected(userId)
    );
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      webSocket: this.wsServer?.getStats() ?? null,
      sse: this.sseServer.getStats(),
      activeBatches: this.batchTracking.size,
    };
  }

  /**
   * Shutdown notification service
   */
  async shutdown(): Promise<void> {
    if (this.wsServer) await this.wsServer.shutdown();
    await this.sseServer.shutdown();
    await this.emailClient.shutdown();

    this.batchTracking.clear();

    logger.info("Notification service shut down");
  }
}
