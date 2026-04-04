// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/transcript.summarizer.ts
//    Generates RichContext (video_summary + post_angles) from
//    transcript checkpoints via Gemini, with key rotation fallback.
//
// Used by: TranscriptWorker
// ═══════════════════════════════════════════════════════════

import { GeminiClient } from "./GeminiClient.js";
import { buildRichContextPrompt } from "./prompts/gemini.prompts.js";
import { updateTranscriptRichContext } from "../../modules/db/db.transcript.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../utils/env.js";
import type { RichContext, PostAngle } from "../../types/index.js";

/** Returns all configured Gemini API keys in order */
function getGeminiKeys(): string[] {
  return [env.GEMINI_API_KEY, env.GEMINI_API_KEY_2].filter(Boolean);
}

function isQuotaError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("ratelimit") ||
    msg.includes("too many requests") ||
    msg.includes("rpd") ||
    msg.includes("daily limit")
  );
}

export interface TranscriptCheckpoint {
  text: string;
  start: number;
  duration: number;
}

export interface RichContextResult {
  richContext: RichContext;
}

/**
 * Generate RichContext (video_summary + post_angles) from transcript checkpoints.
 * Tries each configured Gemini API key in order, rotating on quota errors.
 * Add GEMINI_API_KEY_2 (and beyond) in env to increase daily capacity.
 *
 * @param checkpoints - Time-aligned transcript segments
 * @param ytId        - YouTube video ID — used to update the transcript row
 * @returns Parsed RichContext, or throws on failure
 */
export async function generateRichContext(
  checkpoints: TranscriptCheckpoint[],
  ytId: string
): Promise<RichContextResult> {
  logger.info("Starting rich context generation", {
    ytId,
    checkpoints: checkpoints.length,
  });

  const prompt = buildRichContextPrompt(checkpoints);
  const keys = getGeminiKeys();
  let lastError: unknown;

  for (let i = 0; i < keys.length; i++) {
    try {
      const gemini = new GeminiClient(keys[i]);
      const raw = await gemini.generateContent(prompt);
      logger.info("Rich context generated via Gemini", { ytId, keyIndex: i });

      const richContext = parseAndValidate(raw, ytId);

      const ok = await updateTranscriptRichContext(ytId, richContext);
      if (!ok) {
        throw new Error(`Failed to persist rich_context to transcript table (yt_id: ${ytId})`);
      }

      logger.info("Rich context generation completed", {
        ytId,
        postAnglesCount: richContext.post_angles.length,
      });

      return { richContext };
    } catch (error) {
      lastError = error;
      if (isQuotaError(error) && i < keys.length - 1) {
        logger.warn(`Gemini key ${i + 1} quota exceeded — trying key ${i + 2}`, { ytId });
        continue;
      }
      // Non-quota error or no more keys — rethrow
      throw error;
    }
  }

  // All keys exhausted
  throw lastError ?? new Error(`All Gemini API keys exhausted for yt_id: ${ytId}`);
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function parseAndValidate(raw: string, ytId: string): RichContext {
  // Strip markdown fences if present
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Extract outermost {...} block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  return validate(parsed, ytId, raw);
}

function validate(parsed: unknown, ytId: string, raw: string): RichContext {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(
      `AI response is not an object (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.video_summary !== "string" || obj.video_summary.trim() === "") {
    throw new Error(
      `AI response missing valid video_summary (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  if (!Array.isArray(obj.post_angles) || obj.post_angles.length === 0) {
    throw new Error(
      `AI response missing valid post_angles array (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  for (const angle of obj.post_angles as unknown[]) {
    validatePostAngle(angle, ytId, raw);
  }

  return {
    video_summary: obj.video_summary,
    post_angles: obj.post_angles as PostAngle[],
  };
}

function validatePostAngle(angle: unknown, ytId: string, raw: string): void {
  if (typeof angle !== "object" || angle === null) {
    throw new Error(
      `post_angle is not an object (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  const a = angle as Record<string, unknown>;
  const requiredStrings: (keyof PostAngle)[] = ["tone", "category", "hook", "core_insight"];

  for (const field of requiredStrings) {
    if (typeof a[field] !== "string") {
      throw new Error(
        `post_angle missing required string field "${field}" (yt_id: ${ytId}): ${raw.slice(0, 200)}`
      );
    }
  }

  if (typeof a.score !== "number" || a.score < 1 || a.score > 10) {
    throw new Error(
      `post_angle score must be a number in [1, 10] (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  if (typeof a.sequence !== "number") {
    throw new Error(
      `post_angle missing required number field "sequence" (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  if (typeof a.timestamp_start !== "number") {
    throw new Error(
      `post_angle missing required number field "timestamp_start" (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }

  // concrete_details must be an object with quotes, stats, examples arrays
  const cd = a.concrete_details;
  if (typeof cd !== "object" || cd === null || Array.isArray(cd)) {
    throw new Error(
      `post_angle concrete_details must be an object (yt_id: ${ytId}): ${raw.slice(0, 200)}`
    );
  }
  const cdObj = cd as Record<string, unknown>;
  for (const key of ["quotes", "stats", "examples"] as const) {
    if (!Array.isArray(cdObj[key])) {
      throw new Error(
        `post_angle concrete_details.${key} must be an array (yt_id: ${ytId}): ${raw.slice(0, 200)}`
      );
    }
  }
}
