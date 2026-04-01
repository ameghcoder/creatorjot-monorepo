import { logger } from "../../lib/logger.js";
import { supabase } from "../../lib/supabase.js";
import type { SupportedLang, TranscriptSource, RichContext } from "../../types/index.js";
import fetchTranscriptFromAPI from "../external/api.transcript.js";

// ── Type Definitions ────────────────────────────────────────

export interface TranscriptRecord {
  id: string;
  yt_id: string;
  url: string;
  lang: SupportedLang;
  duration: number;
  transcript_source: TranscriptSource;
  rich_context?: RichContext | null;
  rich_context_extracted_at?: string | null;
  created_at: string;
}

export interface TranscriptRecordMinimal {
  id: string;
  yt_id: string;
  url: string;
  lang: SupportedLang;
  duration: number;
  transcript_source: TranscriptSource;
  rich_context_extracted_at: string | null;
  created_at: string;
}

export interface SaveTranscriptInput {
  yt_id: string;
  url: string;
  lang: SupportedLang;
  duration: number;
  transcript_source?: TranscriptSource;
}

/**
 * Checks if a transcript already exists in the database for a given YouTube video ID.
 *
 * @param ytId - The YouTube video ID (11 characters)
 * @returns Object with `exists` flag and optional `data`:
 *   - `exists: true` with `data` populated if the transcript is found
 *   - `exists: false` if not found (PGRST116) or on DB error
 *
 * @example
 * const result = await transcriptExists("dQw4w9WgXcQ");
 * if (result.exists && result.data) {
 *   console.log("Transcript URL:", result.data.url);
 * }
 */
export async function transcriptExists(
  ytId: string
): Promise<{ exists: boolean; data?: TranscriptRecord }> {
  logger.debug("Checking if transcript exists", { yt_id: ytId });

  const { data, error } = await supabase
    .from("transcript")
    .select("*")
    .eq("yt_id", ytId)
    .single();

  if (error) {
    // PGRST116 = no rows found (not an error, just doesn't exist)
    if (error.code === "PGRST116") {
      logger.debug("Transcript not found", { yt_id: ytId });
      return { exists: false };
    }

    // Actual error
    logger.error("Failed to check transcript existence", {
      error: error.message,
      yt_id: ytId,
    });
    return { exists: false };
  }

  logger.debug("Transcript found", { yt_id: ytId, id: data.id });
  return {
    exists: true,
    data: data as TranscriptRecord,
  };
}

/**
 * Minimal transcript existence check — does not return rich_context payload.
 * Uses `rich_context_extracted_at` to indicate whether AI processing is complete.
 *
 * @param ytId - The YouTube video ID (11 characters)
 * @returns Object with `exists` flag and optional `data`
 */
export async function transcriptExistsMinimal(
  ytId: string
): Promise<{ exists: boolean; data?: TranscriptRecordMinimal }> {
  logger.debug("Checking if transcript exists", { yt_id: ytId });

  const { data, error } = await supabase
    .from("transcript")
    .select(`
      id,
      yt_id,
      lang,
      url,
      duration,
      transcript_source,
      created_at,
      rich_context_extracted_at
      `)
    .eq("yt_id", ytId)
    .single();

  if (error) {
    // PGRST116 = no rows found (not an error, just doesn't exist)
    if (error.code === "PGRST116") {
      logger.debug("Transcript not found", { yt_id: ytId });
      return { exists: false };
    }

    // Actual error
    logger.error("Failed to check transcript existence", {
      error: error.message,
      yt_id: ytId,
    });
    return { exists: false };
  }

  logger.debug("Transcript found", { yt_id: ytId, id: data.id });
  return {
    exists: true,
    data: data as TranscriptRecordMinimal,
  };
}


/**
 * Saves a new transcript record to the database.
 *
 * @param input - Transcript data to persist:
 *   - `yt_id`: YouTube video ID (must be exactly 11 characters)
 *   - `url`: Supabase Storage URL pointing to the transcript text file
 *   - `lang`: Language code (e.g. `"en"`, `"es"`)
 *   - `duration`: Video duration in seconds
 *   - `transcript_source`: `"api"` (default) or `"sst"`
 * @returns The UUID of the newly created transcript row, or `null` on failure
 *
 * @example
 * const id = await saveTranscript({
 *   yt_id: "dQw4w9WgXcQ",
 *   url: "https://storage.example.com/transcripts/dQw4w9WgXcQ.txt",
 *   lang: "en",
 *   duration: 212,
 * });
 */
export async function saveTranscript(
  input: SaveTranscriptInput
): Promise<string | null> {
  // set precision of 2 for the duration
  const precisedDuration = input.duration.toFixed(2);

  logger.debug("Saving transcript record", {
    yt_id: input.yt_id,
    lang: input.lang,
    duration: precisedDuration,
  });

  // Validate yt_id length (must be 11 characters)
  if (input.yt_id.length !== 11) {
    logger.error("Invalid YouTube ID length", {
      yt_id: input.yt_id,
      length: input.yt_id.length,
    });
    return null;
  }

  const { data, error } = await supabase
    .from("transcript")
    .insert({
      yt_id: input.yt_id,
      lang: input.lang,
      url: input.url,
      duration: precisedDuration,
      transcript_source: input.transcript_source ?? "api",
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to save transcript", {
      error: error.message,
      yt_id: input.yt_id,
    });
    return null;
  }

  logger.info("Transcript saved successfully", {
    id: data.id,
    yt_id: input.yt_id,
  });

  return data.id;
}

/**
 * Retrieves a transcript record by its database UUID.
 *
 * @param id - The transcript row UUID
 * @returns The full `TranscriptRecord`, or `null` if not found or on DB error
 *
 * @example
 * const transcript = await getTranscriptById("550e8400-e29b-41d4-a716-446655440000");
 * if (transcript) {
 *   console.log("Storage URL:", transcript.url);
 * }
 */
export async function getTranscriptById(
  id: string
): Promise<TranscriptRecord | null> {
  logger.debug("Fetching transcript by ID", { id });

  const { data, error } = await supabase
    .from("transcript")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      logger.debug("Transcript not found", { id });
      return null;
    }

    logger.error("Failed to fetch transcript", {
      error: error.message,
      id,
    });
    return null;
  }

  return data as TranscriptRecord;
}

/**
 * Updates the `rich_context` and `rich_context_extracted_at` fields of an existing transcript row.
 *
 * @param ytId       - The YouTube video ID identifying the transcript to update
 * @param richContext - The parsed RichContext object to persist
 * @returns `true` if the update succeeded, `false` on DB error
 */
export async function updateTranscriptRichContext(
  ytId: string,
  richContext: RichContext
): Promise<boolean> {
  logger.debug("Updating transcript rich context", { yt_id: ytId });

  const { error } = await supabase
    .from("transcript")
    .update({
      rich_context: richContext,
      rich_context_extracted_at: new Date().toISOString(),
    })
    .eq("yt_id", ytId);

  if (error) {
    logger.error("Failed to update transcript rich context", {
      error: error.message,
      yt_id: ytId,
    });
    return false;
  }

  logger.debug("Transcript rich context updated", { yt_id: ytId });
  return true;
}

export interface TranscriptCCData {
  transcript_id: string;
  yt_id: string;
  lang: string;
  duration: number;
  has_rich_context: boolean;
  is_cached?: boolean;
}

/**
 * Returns transcript data from the DB cache, or fetches it from the external
 * API and persists it if not yet cached.
 *
 * This is the primary entry point for obtaining transcript data in route
 * handlers and workers. It abstracts the cache-or-fetch pattern so callers
 * never need to call `transcriptExists` and `fetchTranscriptFromAPI` directly.
 *
 * @param ytId - The YouTube video ID (11 characters)
 * @returns `TranscriptCCData` containing the transcript ID, storage URL, language,
 *   duration, and whether rich context has been extracted
 * @throws `Error` if the transcript cannot be fetched from the external API,
 *   or if it was fetched but failed to persist — callers should catch and
 *   pass to `next(error)` or respond with an appropriate HTTP status
 *
 * @example
 * try {
 *   const data = await getOrFetchTranscript("dQw4w9WgXcQ");
 *   res.json({ transcript_id: data.transcript_id });
 * } catch (err) {
 *   next(err);
 * }
 */
export async function getOrFetchTranscript(ytId: string): Promise<TranscriptCCData> {
  const cached = await transcriptExistsMinimal(ytId);

  if (cached.exists && cached.data) {
    logger.info("Transcript found in cache", {
      yt_id: ytId,
      transcriptId: cached.data.id,
    });

    return {
      transcript_id: cached.data.id,
      yt_id: cached.data.yt_id,
      lang: cached.data.lang,
      duration: cached.data.duration,
      has_rich_context: cached.data.rich_context_extracted_at !== null,
      is_cached: true
    };
  }

  // Not cached — fetch from external API (also saves to storage + DB)
  logger.info("Transcript not in cache, fetching from API", { yt_id: ytId });

  const fetchedTranscript = await fetchTranscriptFromAPI(ytId);

  if (!fetchedTranscript) {
    logger.error("Failed to fetch transcript from API", { yt_id: ytId });
    throw new Error("Failed to fetch transcript from external API");
  }

  logger.info("Transcript fetched and saved successfully", {
    yt_id: ytId,
    transcriptId: fetchedTranscript.transcript_id,
  });

  return {
    transcript_id: fetchedTranscript.transcript_id,
    yt_id: fetchedTranscript.yt_id,
    lang: fetchedTranscript.lang,
    duration: fetchedTranscript.duration,
    has_rich_context: false,
    is_cached: false
  };
}
