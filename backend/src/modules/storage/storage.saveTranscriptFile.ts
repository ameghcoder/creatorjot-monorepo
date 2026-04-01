import { logger } from "../../lib/logger.js";
import { supabase } from "../../lib/supabase.js";
import { SupportedLang } from "../../types/index.js";
import { TranscriptChunk } from "../external/api.transcript.js";

export interface TranscriptStorageFile {
  yt_id: string;
  lang: SupportedLang;
  roundDurationValue: number;
  chunks: number;
  transcript: TranscriptChunk[];
  created_at: string;
}

/**
 * Saves transcript JSON data to Supabase Storage.
 * 
 * @param json_content - Array of transcript chunks with text, start time, and duration
 * @param yt_id - YouTube video ID (used for file naming)
 * @param lang - Language code of the transcript
 * @param duration - Total duration of the video in seconds
 * @returns Object with storage URL and file path, or null if failed
 */
export default async function saveTranscriptToStorage(
  json_content: TranscriptChunk[],
  yt_id: string,
  lang: SupportedLang,
  duration: number
): Promise<{ url: string; path: string } | null> {

  const roundDurationValue = Math.ceil(duration);

  logger.debug("Saving: transcript json data to storage", {
    yt_id,
    lang,
    roundDurationValue,
    chunks: json_content.length,
  });

  try {
    // ── Step 1: Prepare the JSON data ────────────────────
    const transcriptData: TranscriptStorageFile = {
      yt_id,
      lang,
      roundDurationValue,
      chunks: json_content.length,
      transcript: json_content,
      created_at: new Date().toISOString(),
    };

    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(transcriptData, null, 2);
    const jsonBuffer = Buffer.from(jsonString, "utf-8");

    // ── Step 2: Generate file path ───────────────────────
    // Format: transcripts/{yt_id}_{lang}_{timestamp}.json
    const fileName = `${yt_id}_${lang}_${roundDurationValue}.json`;
    const filePath = fileName;

    logger.debug("Uploading transcript to storage", {
      filePath,
      size: jsonBuffer.length,
    });

    // ── Step 3: Upload to Supabase Storage ───────────────
    const { data, error } = await supabase.storage
      .from("transcript")
      .upload(filePath, jsonBuffer, {
        contentType: "application/json",
        upsert: true, // Don't overwrite if exists
        cacheControl: "3600", // Cache for 1 hour
      });

    if (error) {
      logger.error("Failed to upload transcript to storage", {
        error: error.message,
        yt_id,
        filePath,
      });
      return null;
    }

    logger.debug("Transcript uploaded successfully", {
      path: data.path,
    });

    // ── Step 4: Get public URL ────────────────────────────
    const { data: urlData } = supabase.storage
      .from("transcript")
      .getPublicUrl(filePath);

    logger.info("Transcript saved to storage successfully", {
      yt_id,
      url: urlData.publicUrl,
      path: filePath,
    });

    return {
      url:  urlData.publicUrl,
      path: filePath,
    };
  } catch (err) {
    logger.error("Unexpected error saving transcript to storage", {
      error: err instanceof Error ? err.message : String(err),
      yt_id,
    });
    return null;
  }
}