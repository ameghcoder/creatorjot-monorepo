// This script helps to cleanup the transcript chunks, by removing unwanted buzz words and some silence like [music] like phrases etc.

import type { TranscriptChunk } from "../modules/external/api.transcript.js";

/**
 * Bracket/parenthesis noise patterns that indicate non-speech audio events.
 * Examples: [Music], [Applause], (inaudible), [BLANK_AUDIO], ♪ ... ♪
 */
const NOISE_PATTERN = /^\s*[\[(♪].*?[\])\♪]\s*$|^\s*♪.*?♪\s*$/i;
const INLINE_NOISE_REGEX = /\s*[\[(][^\])]+[\])]\s*/gi; // it helps to findout the noise patterns inside the string

/**
 * Filler words and verbal tics that add no semantic value.
 * Matched as whole words only (word boundaries) to avoid false positives.
 */
const FILLER_WORDS = [
  "uh", "um", "uhh", "umm", "hmm", "hm", "erm",
  "like", "you know", "i mean", "kind of", "sort of",
  "basically", "literally", "actually", "right", "okay", "ok",
  "so", "well", "anyway", "anyways", ">>",
];

const FILLER_REGEX = new RegExp(
  `\\b(${FILLER_WORDS.map(w => w.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "gi"
);

/**
 * Cleans a single text chunk:
 * 1. Strips bracket/parenthesis noise tags (e.g. [Music], (inaudible))
 * 2. Removes filler words
 * 3. Collapses extra whitespace and trims
 */
function cleanText(text: string): string {
  return text
    .replace(INLINE_NOISE_REGEX, " ")   // remove filler words
    .replace(FILLER_REGEX, "")   // remove filler words
    .replace(/\s{2,}/g, " ")     // collapse multiple spaces
    .trim();
}

/**
 * Cleans an array of transcript chunks by:
 * - Dropping chunks that are pure noise (e.g. [Music], [Applause], ♪ ... ♪)
 * - Stripping filler words from remaining chunk text
 * - Dropping chunks that become empty after cleaning
 *
 * The `start` and `duration` timestamps are preserved as-is so the cleaned
 * array remains usable for time-aligned processing downstream.
 *
 * @param chunks - Raw transcript chunks from the external API
 * @returns Cleaned array of transcript chunks with the same shape
 *
 * @example
 * const cleaned = transcriptCleaner([
 *   { text: "[Music]", start: 0, duration: 3 },
 *   { text: "Uh, welcome to the show.", start: 3, duration: 2 },
 * ]);
 * // → [{ text: "welcome to the show.", start: 3, duration: 2 }]
 */
function transcriptCleaner(chunks: TranscriptChunk[]): TranscriptChunk[] {
  if (!chunks || chunks.length === 0) return [];

  return chunks.reduce<TranscriptChunk[]>((acc, chunk) => {
    // Drop pure noise chunks (e.g. [Music], [Applause], ♪ melody ♪)
    if (NOISE_PATTERN.test(chunk.text)) return acc;

    const cleaned = cleanText(chunk.text);

    // Drop chunks that are empty after cleaning
    if (!cleaned) return acc;

    acc.push({ ...chunk, text: cleaned });
    return acc;
  }, []);
}

export default transcriptCleaner;
