// ═══════════════════════════════════════════════════════════
// 📁 /worker/ErrorHandler.ts — Error Handler for Job Processing
// ═══════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { queueManager } from "../queue/QueueManager.js";
import type { BaseJob } from "../queue/types.js";
import type { NotificationService } from "../notifications/index.js";

/**
 * Error classification types
 */
export type ErrorType = "transient" | "permanent";

export interface ErrorClassification {
  type: ErrorType;
  shouldRetry: boolean;
  reason: string;
}

/**
 * HTTP Error class
 */
export class HTTPError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "HTTPError";
  }
}

/**
 * Business logic error classes
 */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class TranscriptNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptNotAvailableError";
  }
}

/**
 * ErrorHandler classifies errors and implements retry logic with exponential backoff.
 * 
 * Responsibilities:
 * - Classify errors as transient or permanent
 * - Implement retry decision logic
 * - Calculate exponential backoff delays
 * - Handle rate limit errors (HTTP 429)
 * - Handle server errors (HTTP 5xx)
 * - Handle client errors (HTTP 4xx) as permanent failures
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 19.1, 19.2, 19.3, 19.4, 19.5
 */
export class ErrorHandler {
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
  private notificationService: NotificationService | null = null;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService || null;
  }

  /**
   * Classify an error as transient or permanent
   */
  classify(error: Error): ErrorClassification {
    // Network errors - transient.
    // `"code" in error` is safe here because `error` is typed as `Error` (an object),
    // so the `in` operator will not throw. We then cast to `any` only to read the value.
    if ("code" in error) {
      const code = (error as any).code;
      if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
        return {
          type: "transient",
          shouldRetry: true,
          reason: "network_error",
        };
      }
    }

    // HTTP errors
    if (error instanceof HTTPError) {
      // Rate limit - transient
      if (error.status === 429) {
        return {
          type: "transient",
          shouldRetry: true,
          reason: "rate_limit",
        };
      }

      // Server errors - transient
      if (error.status >= 500) {
        return {
          type: "transient",
          shouldRetry: true,
          reason: "server_error",
        };
      }

      // Client errors - permanent
      if (error.status >= 400 && error.status < 500) {
        return {
          type: "permanent",
          shouldRetry: false,
          reason: "client_error",
        };
      }
    }

    // Database errors - transient.
    // Same safe `"code" in error` pattern as above — `Error` is always an object.
    if ("code" in error) {
      const code = (error as any).code;
      if (code === "57P03" || code === "08006") {
        return {
          type: "transient",
          shouldRetry: true,
          reason: "db_connection",
        };
      }
    }

    // Business logic errors - permanent
    if (error instanceof QuotaExceededError) {
      return {
        type: "permanent",
        shouldRetry: false,
        reason: "quota_exceeded",
      };
    }

    if (error instanceof TranscriptNotAvailableError) {
      return {
        type: "permanent",
        shouldRetry: false,
        reason: "resource_not_found",
      };
    }

    // AI provider quota / rate-limit errors (Gemini RPD, Anthropic 429-style messages)
    // These are permanent for the current job — retrying immediately won't help.
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("ratelimit") ||
      msg.includes("too many requests") ||
      msg.includes("rpd") ||
      msg.includes("daily limit")
    ) {
      return {
        type: "permanent",
        shouldRetry: false,
        reason: "quota_exceeded",
      };
    }

    // Default to transient for unknown errors
    return {
      type: "transient",
      shouldRetry: true,
      reason: "unknown",
    };
  }

  /**
   * Calculate retry delay based on attempt number (exponential backoff)
   */
  calculateRetryDelay(attempt: number): number {
    const index = Math.min(attempt - 1, this.RETRY_DELAYS.length - 1);
    return this.RETRY_DELAYS[index];
  }

  /**
   * Handle job error with retry logic
   */
  async handleJobError(
    job: BaseJob & { type: "transcript" | "generation"; queue: string },
    error: Error,
  ): Promise<void> {
    const classification = this.classify(error);

    logger.info("Handling job error", {
      jobId: job.id,
      jobType: job.type,
      errorType: classification.type,
      reason: classification.reason,
      attempts: job.attempts,
      maxAttempts: this.MAX_ATTEMPTS,
    });

    // Increment attempts — guard against null since pg-boss job.data doesn't
    // carry the DB attempts counter; the field is populated from the business
    // table row, which may not be hydrated when the job is first dequeued.
    const currentAttempts = job.attempts ?? 0;
    const newAttempts = currentAttempts + 1;

    // Determine if should retry
    const shouldRetry = classification.shouldRetry && newAttempts < this.MAX_ATTEMPTS;

    if (shouldRetry) {
      // Calculate retry delay
      const delay = this.calculateRetryDelay(newAttempts);

      logger.info("Job will be retried", {
        jobId: job.id,
        attempt: newAttempts,
        delay: `${delay}ms`,
        reason: classification.reason,
      });

      // Update job for retry
      await this.updateJobForRetry(job, error, newAttempts, classification);

      // Re-publish to queue with delay.
      // IMPORTANT: spread the updated attempts count into the payload so the
      // next dequeue sees the correct value — pg-boss does not mutate job.data,
      // so without this the counter stays at 0 on every retry and MAX_ATTEMPTS
      // is never reached.
      await queueManager.publish(
        job.queue,
        { ...job, attempts: newAttempts },
        {
          startAfter: Math.ceil(delay / 1000),
          priority: job.priority,
        }
      );
    } else {
      // Permanent failure or max attempts reached
      logger.error("Job permanently failed", {
        jobId: job.id,
        jobType: job.type,
        attempts: newAttempts,
        reason: classification.shouldRetry
          ? "max_attempts_reached"
          : classification.reason,
      });

      await this.markJobFailed(job, error, newAttempts, classification);
    }
  }

  /**
   * Update job for retry
   */
  private async updateJobForRetry(
    job: BaseJob & { type: "transcript" | "generation" },
    error: Error,
    newAttempts: number,
    classification: ErrorClassification
  ): Promise<void> {
    const tableName = job.type === "transcript" ? "transcript_queue" : "generation_queue";

    // Update job status
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        status: "pending",
        attempts: newAttempts,
        error_message: error.message,
        processing_started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      logger.error("Failed to update job for retry", {
        jobId: job.id,
        error: updateError.message,
      });
      throw updateError;
    }

    // Log retry event
    await supabase.from("job_logs").insert({
      job_id: job.id,
      job_type: job.type,
      event_type: "retry",
      message: `Retry attempt ${newAttempts} after ${classification.reason}`,
      error_details: {
        message: error.message,
        stack: error.stack,
        classification,
      },
    });
  }

  /**
   * Mark job as permanently failed
   */
  private async markJobFailed(
    job: BaseJob & { type: "transcript" | "generation" },
    error: Error,
    newAttempts: number,
    classification: ErrorClassification
  ): Promise<void> {
    const tableName = job.type === "transcript" ? "transcript_queue" : "generation_queue";

    // Update job status to failed
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        status: "failed",
        attempts: newAttempts,
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      logger.error("Failed to mark job as failed", {
        jobId: job.id,
        error: updateError.message,
      });
      throw updateError;
    }

    // Log failed event
    const failureMessage = classification.shouldRetry
      ? `Max attempts (${this.MAX_ATTEMPTS}) reached`
      : `Permanent failure: ${classification.reason}`;

    await supabase.from("job_logs").insert({
      job_id: job.id,
      job_type: job.type,
      event_type: "failed",
      message: failureMessage,
      error_details: {
        message: error.message,
        stack: error.stack,
        classification,
      },
    });

    // Send failure notification for generation jobs
    if (job.type === "generation" && this.notificationService) {
      try {
        // Get platform from job
        const { data: jobData } = await supabase
          .from("generation_queue")
          .select("platform")
          .eq("id", job.id)
          .single();

        const userFriendlyError = this.getUserFriendlyError(error, classification);

        await this.notificationService.sendJobNotification({
          userId: job.userId,
          jobId: job.id,
          sessionId: job.sessionId,
          status: "failed",
          platform: jobData?.platform,
          errorMessage: userFriendlyError,
        });

        logger.debug("Failure notification sent", { jobId: job.id });
      } catch (notifError) {
        logger.error("Error sending failure notification", {
          jobId: job.id,
          error: notifError instanceof Error ? notifError.message : String(notifError),
        });
        // Don't throw - notification failure shouldn't fail the error handling
      }
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyError(error: Error, classification: ErrorClassification): string {
    switch (classification.reason) {
      case "rate_limit":
        return "Service is temporarily busy. Your job will be retried automatically.";
      case "quota_exceeded":
        return "You have reached your monthly generation limit. Please upgrade your plan.";
      case "resource_not_found":
        return "The requested video transcript is not available.";
      case "storage_quota":
        return "Your storage quota is full. Please upgrade or free up space.";
      default:
        return "An error occurred while processing your job. Our team has been notified.";
    }
  }
}
