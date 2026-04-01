// ═══════════════════════════════════════════════════════════
// 📁 /queue/JobManagementService.ts — Job Management Service
// ═══════════════════════════════════════════════════════════

import { queueManager, QUEUE_NAMES } from "./QueueManager.js";
import { duplicateChecker } from "./utils/DuplicateChecker.js";
import { calculatePriority } from "./utils/priority.js";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type {
  TranscriptJobParams,
  GenerationJobParams,
  BatchGenerationParams,
  JobResult,
  BatchJobResult,
  JobStatusResponse,
  QueueMetrics,
} from "./types.js";

/**
 * JobManagementService handles job enqueuing, status tracking,
 * cancellation, and metrics for the queue system.
 */
export class JobManagementService {
  private readonly MAX_ATTEMPTS = 3;
  private readonly MAX_BATCH_SIZE = 10;

  /**
   * Enqueue a transcript processing job
   */
  async enqueueTranscriptJob(params: TranscriptJobParams): Promise<JobResult> {
    try {
      // Check for duplicate job
      const duplicateJobId = await duplicateChecker.checkTranscriptDuplicate(
        params.userId,
        params.ytId,
        params.sessionId
      );

      if (duplicateJobId) {
        logger.info("Returning existing transcript job", { jobId: duplicateJobId });
        return {
          success: true,
          jobId: duplicateJobId,
        };
      }

      // Calculate priority based on user tier
      const priority = calculatePriority(params.userTier);

      // Create job record in database
      const { data: jobData, error: dbError } = await supabase
        .from("transcript_queue")
        .insert({
          user_id: params.userId,
          yt_id: params.ytId,
          session_id: params.sessionId,
          status: "pending",
          priority,
          attempts: 0,
          max_attempts: this.MAX_ATTEMPTS,
          metadata: {},
        })
        .select("id")
        .single();

      if (dbError || !jobData) {
        logger.error("Failed to create transcript job in database", { error: dbError });
        return {
          success: false,
          error: "Failed to create job",
        };
      }

      // Log job queued event
      await this.logJobEvent(jobData.id, "transcript", "queued", "Job enqueued");

      // Publish to pg-boss queue
      const jobId = await queueManager.publish(
        QUEUE_NAMES.TRANSCRIPT,
        {
          id: jobData.id,
          userId: params.userId,
          ytId: params.ytId,
          sessionId: params.sessionId,
          pendingGenerationJobs: params.pendingGenerationJobs ?? [],
          generateSummary: params.generateSummary ?? true,
          generateRichContext: params.generateRichContext ?? true,
        },
        { priority }
      );

      logger.info("Transcript job enqueued", {
        jobId,
        userId: params.userId,
        ytId: params.ytId,
        priority,
      });

      return {
        success: true,
        jobId: jobData.id,
      };
    } catch (error) {
      logger.error("Failed to enqueue transcript job", { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Enqueue a content generation job
   */
  async enqueueGenerationJob(params: GenerationJobParams): Promise<JobResult> {
    try {
      // Check for duplicate job
      const duplicateJobId = await duplicateChecker.checkGenerationDuplicate(
        params.userId,
        params.transcriptId,
        params.platform,
        params.outputLang
      );

      if (duplicateJobId) {
        logger.info("Returning existing generation job", { jobId: duplicateJobId });
        return {
          success: true,
          jobId: duplicateJobId,
        };
      }

      // Calculate priority based on user tier
      const priority = calculatePriority(params.userTier);

      // Create job record in database
      const { data: jobData, error: dbError } = await supabase
        .from("generation_queue")
        .insert({
          user_id: params.userId,
          transcript_id: params.transcriptId,
          payload_id: params.payloadId,
          session_id: params.sessionId,
          platform: params.platform,
          output_lang: params.outputLang,
          user_tone_id: params.userToneId || null,
          post_angle_index: params.postAngleIndex ?? null,
          status: "pending",
          priority,
          attempts: 0,
          max_attempts: this.MAX_ATTEMPTS,
          metadata: {},
        })
        .select("id")
        .single();

      if (dbError || !jobData) {
        logger.error("Failed to create generation job in database", { error: dbError });
        return {
          success: false,
          error: "Failed to create job",
        };
      }

      // Log job queued event
      await this.logJobEvent(jobData.id, "generation", "queued", "Job enqueued");

      // Publish to pg-boss queue
      const jobId = await queueManager.publish(
        QUEUE_NAMES.GENERATION,
        {
          id: jobData.id,
          userId: params.userId,
          transcriptId: params.transcriptId,
          payloadId: params.payloadId,
          sessionId: params.sessionId,
          platform: params.platform,
          outputLang: params.outputLang,
          userToneId: params.userToneId,
          tonePreset: params.tonePreset,
          toneCustom: params.toneCustom,
          postAngleIndex: params.postAngleIndex,
          xPostFormat: params.xPostFormat,
        },
        { priority }
      );

      logger.info("Generation job enqueued", {
        jobId,
        userId: params.userId,
        transcriptId: params.transcriptId,
        platform: params.platform,
        priority,
      });

      return {
        success: true,
        jobId: jobData.id,
      };
    } catch (error) {
      logger.error("Failed to enqueue generation job", { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Enqueue multiple generation jobs as a batch
   */
  async enqueueBatchGenerationJobs(
    params: BatchGenerationParams
  ): Promise<BatchJobResult> {
    try {
      // Validate batch size
      if (params.jobs.length > this.MAX_BATCH_SIZE) {
        return {
          success: false,
          error: `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE} jobs`,
        };
      }

      if (params.jobs.length === 0) {
        return {
          success: false,
          error: "Batch must contain at least one job",
        };
      }

      const jobIds: string[] = [];

      // Enqueue each job in the batch
      for (const job of params.jobs) {
        const result = await this.enqueueGenerationJob({
          userId: params.userId,
          transcriptId: params.transcriptId,
          payloadId: params.payloadId,
          sessionId: params.sessionId,
          platform: job.platform,
          outputLang: job.outputLang,
          userToneId: job.userToneId,
          userTier: params.userTier,
          xPostFormat: job.platform === "x" ? job.xPostFormat : undefined,
        });

        if (!result.success || !result.jobId) {
          // If any job fails, return error
          logger.error("Batch job failed", { error: result.error, job });
          return {
            success: false,
            error: result.error || "Failed to enqueue job in batch",
          };
        }

        jobIds.push(result.jobId);
      }

      logger.info("Batch generation jobs enqueued", {
        userId: params.userId,
        transcriptId: params.transcriptId,
        sessionId: params.sessionId,
        jobCount: jobIds.length,
      });

      return {
        success: true,
        jobIds,
      };
    } catch (error) {
      logger.error("Failed to enqueue batch generation jobs", { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string, userId: string): Promise<JobStatusResponse | null> {
    try {
      // Try transcript queue first
      let { data, error } = await supabase
        .from("transcript_queue")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", userId)
        .single();

      // If not found, try generation queue
      if (error && error.code === "PGRST116") {
        const result = await supabase
          .from("generation_queue")
          .select("*")
          .eq("id", jobId)
          .eq("user_id", userId)
          .single();

        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        logger.warn("Job not found", { jobId, userId });
        return null;
      }

      return {
        id: data.id,
        status: data.status,
        progress: data.metadata?.progress,
        currentStep: data.metadata?.currentStep,
        attempts: data.attempts,
        maxAttempts: data.max_attempts,
        errorMessage: data.error_message,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.metadata?.completedAt,
        generationId: data.generation_id ?? undefined,
      };
    } catch (error) {
      logger.error("Failed to get job status", { error, jobId, userId });
      return null;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    try {
      // Try to cancel in transcript queue
      let { data, error } = await supabase
        .from("transcript_queue")
        .update({ status: "cancelled" })
        .eq("id", jobId)
        .eq("user_id", userId)
        .in("status", ["pending", "processing"])
        .select("id")
        .single();

      // If not found, try generation queue
      if (error && error.code === "PGRST116") {
        const result = await supabase
          .from("generation_queue")
          .update({ status: "cancelled" })
          .eq("id", jobId)
          .eq("user_id", userId)
          .in("status", ["pending", "processing"])
          .select("id")
          .single();

        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        logger.warn("Job not found or cannot be cancelled", { jobId, userId });
        return false;
      }

      // Log cancellation event
      const jobType = data ? "transcript" : "generation";
      await this.logJobEvent(jobId, jobType, "cancelled", "Job cancelled by user");

      logger.info("Job cancelled", { jobId, userId });
      return true;
    } catch (error) {
      logger.error("Failed to cancel job", { error, jobId, userId });
      return false;
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      // Get transcript queue stats
      const { data: transcriptStats } = await supabase
        .from("transcript_queue")
        .select("status")
        .in("status", ["pending", "processing", "completed", "failed"]);

      // Get generation queue stats
      const { data: generationStats } = await supabase
        .from("generation_queue")
        .select("status")
        .in("status", ["pending", "processing", "completed", "failed"]);

      // Count by status
      const countByStatus = (data: any[], status: string) =>
        data?.filter((row) => row.status === status).length || 0;

      return {
        transcriptQueue: {
          pending: countByStatus(transcriptStats || [], "pending"),
          processing: countByStatus(transcriptStats || [], "processing"),
          completed: countByStatus(transcriptStats || [], "completed"),
          failed: countByStatus(transcriptStats || [], "failed"),
        },
        generationQueue: {
          pending: countByStatus(generationStats || [], "pending"),
          processing: countByStatus(generationStats || [], "processing"),
          completed: countByStatus(generationStats || [], "completed"),
          failed: countByStatus(generationStats || [], "failed"),
        },
        deadLetterQueue: {
          total: 0, // TODO: Implement DLQ tracking
        },
        averageProcessingTime: {
          transcript: 0, // TODO: Calculate from job_logs
          generation: 0, // TODO: Calculate from job_logs
        },
        successRate: {
          transcript: 0, // TODO: Calculate from stats
          generation: 0, // TODO: Calculate from stats
        },
      };
    } catch (error) {
      logger.error("Failed to get queue metrics", { error });
      throw error;
    }
  }

  /**
   * Log a job event to job_logs table
   */
  private async logJobEvent(
    jobId: string,
    jobType: "transcript" | "generation",
    eventType: string,
    message: string,
    errorDetails?: any
  ): Promise<void> {
    try {
      await supabase.from("job_logs").insert({
        job_id: jobId,
        job_type: jobType,
        event_type: eventType,
        message,
        error_details: errorDetails || null,
      });
    } catch (error) {
      logger.error("Failed to log job event", { error, jobId, eventType });
    }
  }
}

// Export singleton instance
export const jobManagementService = new JobManagementService();
