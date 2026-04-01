// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/prompts/claude.prompts.ts — Claude Prompt Templates
// ═══════════════════════════════════════════════════════════

import type {
  SupportedLang,
  PostAngle,
  ConcreteDetails,
  XPostFormat,
} from "../../../types/index.js";
import { LANGUAGE_NAMES, FORBIDDEN_PHRASES as FORBIDDEN_PHRASES_ARRAY } from "@creatorjot/shared";

// Join for prompt injection — prompts need a comma-separated string
const FORBIDDEN_PHRASES = FORBIDDEN_PHRASES_ARRAY.join(", ");

export { LANGUAGE_NAMES };

// ── Evidence helpers ──────────────────────────────────────────────────────────

/**
 * For Twitter: picks ONE best evidence anchor.
 * Priority: stat > quote > example
 * Returns a formatted prompt block, or a no-fabrication fallback.
 */
function pickBestEvidence(details: ConcreteDetails): string {
  if (details.stats.length > 0) {
    return `EVIDENCE — use this stat verbatim, do not round or paraphrase it:\n"${details.stats[0]}"`;
  }
  if (details.quotes.length > 0) {
    return `EVIDENCE — use this exact quote inside the post:\n"${details.quotes[0]}"`;
  }
  if (details.examples.length > 0) {
    return `EVIDENCE — reference this specific example:\n${details.examples[0]}`;
  }
  return `EVIDENCE: none available — rely on the hook and insight alone.\nDo NOT invent statistics or quotes.`;
}

/**
 * For long-form platforms (LinkedIn, Blog, Email, Tumblr, YT Community):
 * formats all available evidence as distinct labelled blocks.
 * Caps each array to avoid token bloat.
 */
function formatFullEvidence(details: ConcreteDetails): string {
  const lines: string[] = [];

  if (details.quotes.length > 0) {
    lines.push("VERBATIM QUOTES — use at least one directly, word-for-word:");
    details.quotes.slice(0, 3).forEach((q) => lines.push(`  • "${q}"`));
  }

  if (details.stats.length > 0) {
    lines.push("SPECIFIC STATS — reference these exactly as written:");
    details.stats.slice(0, 3).forEach((s) => lines.push(`  • ${s}`));
  }

  if (details.examples.length > 0) {
    lines.push(
      "CONCRETE EXAMPLES — name these specifically, do not generalise:",
    );
    details.examples.slice(0, 3).forEach((e) => lines.push(`  • ${e}`));
  }

  if (lines.length === 0) {
    return "SPECIFIC EVIDENCE: none available — do NOT invent quotes or statistics.";
  }

  return lines.join("\n");
}

/**
 * Trims the full video_summary down to the single sentence most relevant
 * to the post angle's core_insight. Prevents the model from "representing
 * the whole video" instead of focusing on one idea.
 * Falls back to first sentence if no overlap found.
 */
function extractContextSentence(
  videoSummary: string,
  coreInsight: string,
): string {
  const sentences = videoSummary
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 20);

  if (sentences.length <= 1) return videoSummary;

  const insightWords = new Set(
    coreInsight
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4),
  );

  const scored = sentences.map((sentence) => ({
    sentence,
    score: sentence
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => insightWords.has(w)).length,
  }));

  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best.score > 0 ? best.sentence : sentences[0];
}

// ── Platform Builders ─────────────────────────────────────────────────────────
export function buildXPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
  format: XPostFormat = "short", // ← default to short (safe for all users)
): string {
  switch (format) {
    case "long":
      return buildXLongPrompt(postAngle, videoSummary, language, userSavedTone);
    case "thread":
      return buildXThreadPrompt(
        postAngle,
        videoSummary,
        language,
        userSavedTone,
      );
    default:
      return buildXShortPrompt(
        postAngle,
        videoSummary,
        language,
        userSavedTone,
      );
  }
}

function buildXShortPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ?? "Direct and punchy — one idea, zero filler.";
  const evidence = pickBestEvidence(postAngle.concrete_details);
  const contextLine = extractContextSentence(
    videoSummary,
    postAngle.core_insight,
  );

  return `You are a ghostwriter. You write X posts that feel like a real person had a hot take, not like AI summarized a video.

Language: ${languageName} — output must be in this language, no exceptions.

YOUR HOOK — open with this or a sharper version (≤15 words, same punch):
"${postAngle.hook}"

THE SINGLE IDEA:
${postAngle.core_insight}

${evidence}

BACKGROUND (one fact only — do not summarize the whole topic):
${contextLine}

CHARACTER LIMIT: 280 characters TOTAL including spaces and hashtags.
Count carefully. If over, cut the weakest sentence first.

RULES:
- Line 1 = the hook, standing alone
- One idea only — do not try to fit two points
- If evidence is a quote: use it verbatim, cut elsewhere to fit
- If evidence is a stat: lead with the number, explain it in the second sentence
- If evidence is an example: use it as a contrast ("X did Y — most people do Z instead")
- No em-dashes. No asterisk *emphasis*. No rhetorical questions. No "Let's be honest." No "Here's the thing."
- End with 1-2 hashtags on the final line only
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}
- No splleing mistake, double check the spellings

Output only the content. No label. No character count. No json or object`;
}

// ── Long format (X Premium users, up to 1500 chars recommended) ──────────────
// Note: Premium allows 25,000 chars but 800-1500 is the sweet spot for engagement.
function buildXLongPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Analytical but direct — like a smart person thinking out loud.";

  // Long format can use full evidence set
  const evidence = formatFullEvidence(postAngle.concrete_details);
  const contextLine = extractContextSentence(
    videoSummary,
    postAngle.core_insight,
  );

  return `You are a ghostwriter writing a long-form X post for a Premium user. 
This is a mini-essay, not a thread. It reads as one flowing piece.

Language: ${languageName} — output must be in this language, no exceptions.

CRITICAL: The first 280 characters are the preview shown before "Show more".
They must work as a complete hook on their own — assume most people only read this far.

OPENING (first ~280 chars — must stand alone as a hook):
Build this opening around: "${postAngle.hook}"

FULL ARGUMENT TO DEVELOP:
${postAngle.core_insight}

${evidence}

CONTEXT (use for accuracy, not as content to summarize):
${contextLine}

STRUCTURE:
- Opening: hook that works standalone (≤280 chars)
- Build: expand the argument with 2-3 specific supporting points
- Evidence: weave in quotes and stats naturally — do not dump them as a list
- Close: one strong concluding statement or call to action

LENGTH: 600-1000 characters. Long enough to develop the idea, short enough to finish.

RULES:
- Write as one continuous piece — no numbering, no bullet points
- Use line breaks between thoughts for rhythm
- If a verbatim quote is available, use it inside the text — not as a pull quote
- No "In conclusion". No "To summarize".
- 0-2 hashtags max — long posts look cheap with many hashtags
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}
- No splleing mistake, double check the spellings

Output only the content. No label. No character count. No json or object`;
}

function buildXThreadPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Direct and analytical — like a smart person breaking down something complex.";

  // Thread gets full evidence — multiple tweets means room to use everything
  const evidence = formatFullEvidence(postAngle.concrete_details);

  return `You are a ghostwriter writing an X thread. Each tweet must work as a standalone thought AND connect to the next.

Language: ${languageName} — every tweet must be in this language, no exceptions.

THREAD TOPIC:
"${postAngle.hook}"

CORE ARGUMENT TO BUILD ACROSS THE THREAD:
${postAngle.core_insight}

${evidence}

CONTEXT (use for accuracy — do not summarize this wholesale):
${videoSummary}

THREAD STRUCTURE — write exactly in this order:
Tweet 1 (HOOK):
  - A version of the hook above that makes someone stop scrolling
  - Must work as a complete thought on its own
  - ≤240 chars (leaving room for the emoji)

Tweet 2 (CONTEXT):
  - One sentence of background — why this matters or what makes it surprising
  - No more than one idea
  - ≤280 chars

Tweet 3-5 (ARGUMENT):
  - Each tweet develops one supporting point from the core argument
  - At least one tweet must use a verbatim quote or specific stat from the evidence above
  - Each tweet is self-contained — a reader seeing it in isolation understands the point
  - ≤280 chars each

Tweet 6 (CONCLUSION):
  - Restate the core argument as a single sharp sentence
  - Not a summary — a stronger, more confident version of the hook
  - ≤280 chars

Tweet 7 (CTA — optional, include only if it fits naturally):
  - One direct action: follow, reply with opinion, or share
  - Never "What do you think?" — too generic
  - ≤280 chars

FORMAT EACH TWEET EXACTLY LIKE THIS:
[1/] text here
🧵

[2/] text here

[3/] text here

...and so on. The [N/] label is part of the tweet content.

RULES:
- 5-7 tweets total. No more.
- No tweet may exceed 280 characters including the [N/] label
- No bullet points inside individual tweets
- No em-dashes. No asterisk *emphasis*.
- Do not start any tweet with "So," or "Now," or "Remember,"
- Hashtags only on the last tweet — 2 max
- Each tweet must end with a complete sentence — no cliffhangers mid-thought
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output only the thread tweets in order. No explanation. No label outside the [N/] format.`;
}

/**
 * LinkedIn
 * Passes full evidence set — LinkedIn readers expect substance.
 * Full video summary passed as orientation context (not as content source).
 */
export function buildLinkedInPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Sharp professional insight — no corporate jargon, no motivational fluff.";

  const evidence = formatFullEvidence(postAngle.concrete_details);

  return `You are a ghostwriter for a founder or operator who writes LinkedIn posts people actually read.

Language: ${languageName} — output must match this language exactly.

OPENING LINE — your first sentence must be a direct version of this:
"${postAngle.hook}"

CORE ARGUMENT TO BUILD:
${postAngle.core_insight}

${evidence}

BROADER CONTEXT (orientation only — do not summarize this block, use it for accuracy):
${videoSummary}

STRUCTURE:
1. Hook — 1 line, must stand alone before "see more"
2. The insight expanded — 2-3 short paragraphs, one idea each
3. A real opinion or contrarian take — NOT a question like "What do you think?"
4. 3-4 hashtags on the final line

RULES:
- 150-250 words
- Short paragraphs. Single-sentence lines are fine.
- No bullet lists unless the content is genuinely list-shaped
- Never start with "I", "We", or "In today's"
- If a verbatim quote is provided above, use it directly — quotes make posts feel researched
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output only the post. No explanation. No label.`;
}

/**
 * Facebook
 * Passes full evidence but trims context to one sentence.
 * Facebook feed is mobile-first — shorter context = tighter post.
 */
export function buildFacebookPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Warm and conversational — like sharing something with a smart friend.";

  const evidence = formatFullEvidence(postAngle.concrete_details);
  const contextLine = extractContextSentence(
    videoSummary,
    postAngle.core_insight,
  );

  return `You are a ghostwriter who writes Facebook posts that get shared, not scrolled past.

Language: ${languageName} — output must match this language exactly.

HOOK TO OPEN WITH:
"${postAngle.hook}"

MAIN POINT:
${postAngle.core_insight}

${evidence}

BACKGROUND (single sentence for coherence):
${contextLine}

RULES:
- 100-200 words
- Open with the hook, adapted naturally
- Short paragraphs and line breaks — this is read on mobile
- Reference at least one specific detail from the evidence above
- End with one direct CTA — not a vague question
  Good: "Link in comments — worth 10 minutes of your time"
  Bad: "What do you think about this?"
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output only the post. No explanation.`;
}

/**
 * Blog
 * Full evidence set + full video summary.
 * Blog is the one platform where the model needs the complete picture.
 * Quotes and stats are injected as citable evidence, not just context.
 */
export function buildBlogPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Informed and direct — a clear point of view, not a neutral recap.";

  const evidence = formatFullEvidence(postAngle.concrete_details);

  return `You are a ghostwriter writing a blog post that argues a specific, defensible point of view.

Language: ${languageName} — output must match this language exactly.

THESIS (argue this — do not merely describe it):
"${postAngle.hook}"

CORE ARGUMENT:
${postAngle.core_insight}

${evidence}

FULL CONTEXT (your research — mine this for specifics, do not summarize it wholesale):
${videoSummary}

STRUCTURE:
Title: <a title that makes a claim, not just announces a topic>
Introduction: open with a specific fact, a contrast, or a surprising claim — not a definition
Body: 3-4 sections, each developing one argument with evidence
Conclusion: restate the core argument + one concrete thing the reader should do differently

RULES:
- 600-900 words
- Take a clear stance — do not hedge every paragraph
- Use ## markdown for section headings
- First sentence after the title must create tension or state something surprising
- Use at least one verbatim quote from the evidence above if available
- No filler introduction ("In this post we will explore...")
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output: "Title: " on line 1, then the full article. Nothing else.`;
}

/**
 * YouTube Community Post
 * Single best evidence anchor — YT Community is closer to Twitter than LinkedIn.
 * Context trimmed to one sentence to keep the post creator-native and tight.
 */
export function buildYTCommunityPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ?? "Direct creator voice — personal, not polished.";

  // YT Community is short-form like Twitter — one anchor is enough
  const evidence = pickBestEvidence(postAngle.concrete_details);
  const contextLine = extractContextSentence(
    videoSummary,
    postAngle.core_insight,
  );

  return `You are writing a YouTube Community post for a creator who wants their audience to watch a new video.

Language: ${languageName} — output must match this language exactly.

HOOK:
"${postAngle.hook}"

KEY THING THE VIDEO COVERS:
${postAngle.core_insight}

${evidence}

BACKGROUND (one sentence — do not over-explain the video):
${contextLine}

RULES:
- 100-200 words
- Open with the hook
- Sound like the creator talking to their audience directly — not a press release
- Reference the evidence above if it fits naturally
- End with one specific question tied to the video topic, not "What do you think?"
  Good: "Would you actually build to avoid competition instead of win it?"
  Bad: "Let me know your thoughts below!"
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output only the post. No explanation.`;
}

/**
 * Tumblr
 * Full evidence passed — Tumblr readers engage with depth and specificity.
 * Full video summary for narrative coherence (Tumblr posts read like essays).
 */
export function buildTumblrPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Casual and genuine — like someone who actually found this interesting, not a marketer.";

  const evidence = formatFullEvidence(postAngle.concrete_details);

  return `You are writing a Tumblr post for someone sharing something genuinely interesting they learned.

Language: ${languageName} — output must match this language exactly.

CENTRAL IDEA:
"${postAngle.hook}"

CORE INSIGHT:
${postAngle.core_insight}

${evidence}

SOURCE CONTEXT:
${videoSummary}

RULES:
- 150-400 words
- Write as a flowing narrative — NOT a bullet list
- Casual voice, use line breaks for rhythm
- Express a genuine reaction or opinion — this is not a press release
- Weave in specific details from the evidence naturally — do not dump them as a list
- End with 4-6 lowercase tags: #tag format
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output only the post and tags. No explanation.`;
}

/**
 * Email
 * Full evidence passed — email readers expect to know why they should care.
 * Full video summary for the body — emails can carry more context than social posts.
 */
export function buildEmailPrompt(
  postAngle: PostAngle,
  videoSummary: string,
  language: SupportedLang,
  userSavedTone?: string,
): string {
  const languageName = LANGUAGE_NAMES[language];
  const toneInstruction =
    userSavedTone ??
    "Like forwarding something useful to a smart colleague with a personal note.";

  const evidence = formatFullEvidence(postAngle.concrete_details);

  return `You are writing a personal email someone would forward to a colleague about a video they found genuinely useful.

Language: ${languageName} — output must match this language exactly.

THE SUBJECT LINE should be based on:
"${postAngle.hook}"

MAIN POINT OF THE EMAIL:
${postAngle.core_insight}

${evidence}

CONTEXT:
${videoSummary}

FORMAT:
Subject: <subject line>
[blank line]
[warm, specific greeting — not "I hope this email finds you well"]
[body]
[natural sign-off]

RULES:
- 120-200 words body (excluding subject line)
- Write like a human forwarding something — not a newsletter template
- Reference at least one specific detail from the evidence above
- End with a direct CTA to watch the video
- Tone: ${toneInstruction}
- NEVER USE: ${FORBIDDEN_PHRASES}

Output only the email. No explanation.`;
}
