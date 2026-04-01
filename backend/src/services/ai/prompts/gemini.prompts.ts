// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/prompts/gemini.prompts.ts — Gemini Prompt Templates
// ═══════════════════════════════════════════════════════════

/**
 * Prompt templates for Gemini AI service (optimised for gemini-2.5-flash).
 *
 * Design notes:
 * - Single rich context prompt — video_summary + post_angles in one Gemini call.
 * - XML tags delimit input sections — Gemini 2.5 Flash parses these reliably.
 * - Role framing anchors tone and output style.
 * - Score rubric and hook examples are explicit so the model doesn't invent its own.
 * - `generatedAt` is injected at call-time (not module-load) to keep timestamps accurate.
 */

// ─── Rich context prompt ──────────────────────────────────────────────────────

/**
 * Rich context prompt — video_summary + post_angles in a single Gemini call.
 *
 * Replaces the old COMBINED_PROMPT (summary + keyPoints) and
 * RICH_CONTEXT_EXTRACTION_PROMPT (verbatimQuotes / dataPoints / concreteExamples).
 *
 * Placeholders:
 *   {checkpoints}  — pre-formatted checkpoint string ([MM:SS] text lines)
 *   {generatedAt}  — ISO timestamp injected at call-time
 *
 * Score rubric (1–10):
 *   9-10  Core thesis / most memorable moment
 *   7-8   Strong standalone insight, broadly applicable
 *   5-6   Supporting point, useful but not essential
 *   3-4   Minor detail or example
 *   1-2   Filler, transitional, or off-topic
 */
export const RICH_CONTEXT_PROMPT = `You are an expert content analyst. Given the timestamped content below, produce a single JSON object with two fields: video_summary and post_angles.

video_summary: A 200-300 word narrative that captures the arc, central argument, and emotional tone.
  - Write with the same energy and conviction as the source material.
  - Do NOT reference "the transcript", "the video", or "the speaker".
  - Preserve specific numbers, names, and quotes where present.
  - NEVER USE: "delves into", "explores", "discusses", "game-changer", "revolutionize", "innovative"

post_angles: Between 5 and 10 content angles distributed across the full video timeline. Distribute evenly - do not cluster angles in the first third of the video.
  Each angle must have:
    sequence        — integer: 1-based position order across the video timeline
    timestamp_start — integer: approximate second in the video where this angle begins
    score           — integer 1-10. STRICT: max 2 angles may score 9-10. Most should be 6-8.
                      9-10 = single most counterintuitive or surprising claim in the video
                      7-8  = strong insight with clear evidence
                      5-6  = useful supporting point
                      3-4  = minor or contextual detail
    tone            — one word describing the emotional register (one of e.g.: persuasive | educational | informative | entertaining | surprising | inspirational | etc.)
    category        — one word topic category (e.g. "tech", "finance", "productivity")
    hook            — A punchy, platform-ready headline. Must be SPECIFIC, not a topic label.
                      Bad: "Discussion of pricing". Good: "Why charging more actually doubled their conversion rate"
                      Bad: "Tips for web dev". Good: "They raised $30M by ditching CSS entirely"
    core_insight    — 1-2 sentences expanding the hook into the actual argument made
    concrete_details — object with three arrays. Use empty arrays if nothing qualifies.
                      STRICT: quotes must be verbatim from source. Do NOT paraphrase or fabricate.
                      {
                        "quotes":   ["exact phrase under 50 words"],
                        "stats":    ["exact figure as stated: '$30M raised'", "40x faster"],
                        "examples": ["named thing and what it illustrated: 'Amazon books→everything as expand example'"]
                      }

STRICT RULES:
- Return ONLY the JSON object — no markdown fences, no extra keys, no explanation
- Do NOT fabricate quotes or statistics not present in the source
- sequence values must be unique and ordered chronologically
- Distribute angles across the full timeline, not clustered at the start.
- If a section has no verbatim quotes, stats, or examples — empty arrays, not omitted keys

Return ONLY:
{
  "video_summary": "...",
  "post_angles": [
    {
      "sequence": 1,
      "timestamp_start": 30,
      "score": 9,
      "tone": "persuasive",
      "hook": "...",
      "core_insight": "...",
      "concrete_details": {
        "quotes": [],
        "stats": [],
        "examples": []
      }
    }
  ]
}

<checkpoints>
{checkpoints}
</checkpoints>

Generated at: {generatedAt}`;

// ─── Builder function ─────────────────────────────────────────────────────────

/**
 * Build the rich context prompt from timestamped checkpoints.
 *
 * Formats each checkpoint as:
 *   [MM:SS] Segment text…
 *
 * @param checkpoints — Array of { text, start, duration } segments
 */
export function buildRichContextPrompt(
  checkpoints: Array<{ text: string; start: number; duration: number }>
): string {
  const formatted = checkpoints
    .map(({ text, start }) => {
      const mm = Math.floor(start / 60).toString().padStart(2, "0");
      const ss = Math.floor(start % 60).toString().padStart(2, "0");
      return `[${mm}:${ss}] ${text}`;
    })
    .join("\n\n");

  return RICH_CONTEXT_PROMPT
    .replace("{checkpoints}", formatted)
    .replace("{generatedAt}", new Date().toISOString());
}
