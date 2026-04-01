// ═══════════════════════════════════════════════════════════
// packages/shared/src/constants.ts — Shared Constants
//
// Single source of truth for platform configs, language maps,
// and other values used by both backend and frontend.
// ═══════════════════════════════════════════════════════════

import type { SupportedLang, Platforms, XPostFormat, TonePreset } from "./types.js";

// ── Language display names ─────────────────────────────────
// Used in: AI prompts (backend), language selector UI (frontend)

export const LANGUAGE_NAMES: Record<SupportedLang, string> = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
  de: "German",
};

export const SUPPORTED_LANGS: SupportedLang[] = ["en", "hi", "es", "de"];

// ── Platform configs ───────────────────────────────────────
// Used in: video schema validation (backend), platform chips UI (frontend)

export interface PlatformConfig {
  /** Internal key used in DB and API */
  id: Platforms;
  /** Display label shown in UI */
  label: string;
  /** Short description shown in tooltips or sub-labels */
  description: string;
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { id: "x",                label: "X (Twitter)",        description: "Short-form posts" },
  { id: "linkedin",         label: "LinkedIn",            description: "Professional posts" },
  { id: "blog",             label: "Blog",                description: "Long-form articles" },
  { id: "yt_community_post",label: "YT Community",        description: "YouTube community posts" },
  { id: "facebook",         label: "Facebook",            description: "Social posts" },
  { id: "tumblr",           label: "Tumblr",              description: "Casual long-form" },
  { id: "email",            label: "Email",               description: "Newsletter / email" },
];

export const PLATFORMS: Platforms[] = PLATFORM_CONFIGS.map((p) => p.id);

// ── X post format configs ──────────────────────────────────
// Used in: generation request (backend), format selector UI (frontend)

export interface XPostFormatConfig {
  id: XPostFormat;
  label: string;
  description: string;
}

export const X_POST_FORMAT_CONFIGS: XPostFormatConfig[] = [
  { id: "short",  label: "Short",  description: "≤280 characters" },
  { id: "long",   label: "Long",   description: "600-1000 characters (X Premium)" },
  { id: "thread", label: "Thread", description: "5-7 tweet thread" },
];

// ── AI content quality — forbidden phrases ─────────────────
// Used in: Claude prompts (backend), optional tone editor validation (frontend)

export const FORBIDDEN_PHRASES: string[] = [
  "game-changer",
  "dive in",
  "In today's world",
  "It's important to",
  "delve",
  "In conclusion",
  "leverage",
  "unlock potential",
  "foster",
  "I came across",
  "Let's explore",
  "Look no further",
  "takeaway",
  "groundbreaking",
  "transformative",
  "revolutionize",
  "It is worth noting",
  "In this post",
  "Today we",
  "Let's be honest",
  "Here's the thing",
];

// ── Tone presets ───────────────────────────────────────────
// Used in: tone resolution (backend worker), tone selector UI (frontend)

export interface TonePresetConfig {
  id: TonePreset;
  label: string;
  description: string;
  /** Injected as `userSavedTone` in AI prompts */
  toneInstruction: string;
  styleRules: string[];
}

export const TONE_PRESET_CONFIGS: TonePresetConfig[] = [
  {
    id: "viral",
    label: "Viral",
    description: "Bold, punchy, scroll-stopping",
    toneInstruction: "Bold, punchy, high curiosity, scroll-stopping. Use short lines. Allow 1 emoji if it fits naturally. Make strong, slightly provocative statements.",
    styleRules: [
      "Use short lines",
      "Allow 1 emoji if it fits naturally",
      "Make strong, slightly provocative statements",
    ],
  },
  {
    id: "professional",
    label: "Professional",
    description: "Clear, structured, no fluff",
    toneInstruction: "Clear, structured, analytical, no fluff. No emojis. Keep formatting clean and readable. Focus on clarity over cleverness.",
    styleRules: [
      "No emojis",
      "Keep formatting clean and readable",
      "Focus on clarity over cleverness",
    ],
  },
  {
    id: "contrarian",
    label: "Contrarian",
    description: "Opinionated, challenges common beliefs",
    toneInstruction: "Direct, opinionated, challenges common beliefs. Take a strong stance. Highlight what most people get wrong. Avoid neutral phrasing.",
    styleRules: [
      "Take a strong stance",
      "Highlight what most people get wrong",
      "Avoid neutral phrasing",
    ],
  },
  {
    id: "story",
    label: "Story",
    description: "Narrative, engaging, human-like",
    toneInstruction: "Narrative, engaging, human-like. Use smooth transitions. Focus on flow and readability. Avoid overly sharp statements.",
    styleRules: [
      "Use smooth transitions",
      "Focus on flow and readability",
      "Avoid overly sharp statements",
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Extremely concise, high clarity",
    toneInstruction: "Extremely concise, no fluff, high clarity. Keep sentences short. Remove any non-essential words. No emojis or decorative elements.",
    styleRules: [
      "Keep sentences short",
      "Remove any non-essential words",
      "No emojis or decorative elements",
    ],
  },
];

/** Lookup map for O(1) preset resolution in the worker */
export const TONE_PRESET_MAP: Record<TonePreset, TonePresetConfig> = Object.fromEntries(
  TONE_PRESET_CONFIGS.map((p) => [p.id, p])
) as Record<TonePreset, TonePresetConfig>;

export const TONE_PRESETS: TonePreset[] = TONE_PRESET_CONFIGS.map((p) => p.id);

