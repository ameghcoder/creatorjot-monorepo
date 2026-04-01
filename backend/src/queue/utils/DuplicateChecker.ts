// ═══════════════════════════════════════════════════════════
// 📁 /queue/utils/DuplicateChecker.ts — Duplicate Detection
// ═══════════════════════════════════════════════════════════

import type { Platforms, SupportedLang } from "../../types/index.js";
import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

/**
 * DuplicateChecker provides idempotency checking for jobs
 * to prevent duplicate processing within a 24-hour window.
 */
export class DuplicateChecker {
  private readonly DUPLICATE_WINDOW_HOURS = 24;

  /**
   * Check for duplicate transcript job
   * 
   * Idempotency key: user_id + yt_id + session_id
   * Only blocks if a job is currently pending or processing (in-flight).
   * 
   * @returns Job ID if an in-flight duplicate found, null otherwise
   */
  async checkTranscriptDuplicate(
    userId: string,
    ytId: string,
    sessionId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("transcript_queue")
        .select("id, status")
        .eq("user_id", userId)
        .eq("yt_id", ytId)
        .eq("session_id", sessionId)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        logger.error("Error checking transcript duplicate", { error, userId, ytId });
        return null;
      }

      if (data) {
        logger.info("In-flight transcript job detected — skipping duplicate enqueue", {
          userId,
          ytId,
          sessionId,
          existingJobId: data.id,
          existingStatus: data.status,
        });
        return data.id;
      }

      return null;
    } catch (error) {
      logger.error("Failed to check transcript duplicate", { error, userId, ytId });
      return null;
    }
  }

  /**
   * Check for duplicate generation job
   * 
   * Idempotency key: user_id + transcript_id + platform + output_lang
   * Only blocks if a job is currently pending or processing (in-flight).
   * Completed or failed jobs are NOT considered duplicates — the user
   * is allowed to regenerate content for the same video + platform.
   * 
   * @returns Job ID if an in-flight duplicate found, null otherwise
   */
  async checkGenerationDuplicate(
    userId: string,
    transcriptId: string,
    platform: Platforms,
    outputLang: SupportedLang
  ): Promise<string | null> {
    try {
      // Only block on in-flight jobs (pending or processing).
      // completed/failed jobs must NOT block a new generation request.
      const { data, error } = await supabase
        .from("generation_queue")
        .select("id, status")
        .eq("user_id", userId)
        .eq("transcript_id", transcriptId)
        .eq("platform", platform)
        .eq("output_lang", outputLang)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        logger.error("Error checking generation duplicate", {
          error,
          userId,
          transcriptId,
          platform,
        });
        return null;
      }

      if (data) {
        logger.info("In-flight generation job detected — skipping duplicate enqueue", {
          userId,
          transcriptId,
          platform,
          outputLang,
          existingJobId: data.id,
          existingStatus: data.status,
        });
        return data.id;
      }

      return null;
    } catch (error) {
      logger.error("Failed to check generation duplicate", {
        error,
        userId,
        transcriptId,
        platform,
      });
      return null;
    }
  }

  /**
   * Check if a transcript already exists in the database
   * This is used to skip transcript fetching if we already have it
   * 
   * @returns Transcript ID if exists, null otherwise
   */
  async checkTranscriptExists(ytId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("transcript")
        .select("id")
        .eq("yt_id", ytId)
        .single();

      if (error && error.code !== "PGRST116") {
        logger.error("Error checking transcript exists", { error, ytId });
        return null;
      }

      return data?.id || null;
    } catch (error) {
      logger.error("Failed to check transcript exists", { error, ytId });
      return null;
    }
  }
}

// Export singleton instance
export const duplicateChecker = new DuplicateChecker();
