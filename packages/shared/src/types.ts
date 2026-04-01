// ═══════════════════════════════════════════════════════════
// packages/shared/src/types.ts — Shared Domain Types
//
// Used by both backend and frontend.
// No Node.js or browser-specific imports allowed here.
// ═══════════════════════════════════════════════════════════

// ── Primitive types ────────────────────────────────────────

export type Platforms =
  | "x"
  | "linkedin"
  | "blog"
  | "yt_community_post"
  | "facebook"
  | "tumblr"
  | "email";

export type TranscriptSource = "api" | "sst";
export type SupportedLang = "en" | "hi" | "es" | "de";
export type XPostFormat = "short" | "long" | "thread";
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";
export type InputType = "youtube" | "prompt" | "url" | "file";
export type PlanType = "free" | "pro";

/** Built-in tone presets — selected from UI chips */
export type TonePreset = "viral" | "professional" | "contrarian" | "story" | "minimal";
export type SessionStatus = "active" | "archive";

// ── Payloads ───────────────────────────────────────────────

export interface Payloads {
  id: string;
  user_id: string;
  input_type: InputType;
  yt_id?: string;
  prompt_text?: string;
  output_lang: SupportedLang;
  user_tone_id: string;
  settings: Record<string, string>;
  created_at: string;
}

// ── RichContext ────────────────────────────────────────────

export interface ConcreteDetails {
  quotes: string[];
  stats: string[];
  examples: string[];
}

export interface PostAngle {
  sequence: number;
  timestamp_start: number;
  score: number;
  tone: string;
  category: string;
  hook: string;
  core_insight: string;
  concrete_details: ConcreteDetails;
}

export interface RichContext {
  video_summary: string;
  post_angles: PostAngle[];
}

// ── Transcript ─────────────────────────────────────────────

export interface Transcript {
  id: string;
  yt_id: string;
  rich_context?: RichContext;
  rich_context_extracted_at?: string;
  lang: SupportedLang;
  url: string;
  duration: number;
  transcript_source: TranscriptSource;
  summary_version: number;
  created_at: string;
}

// ── Generations ────────────────────────────────────────────

export interface Generations {
  id: string;
  payload_id: string;
  user_id: string;
  session_id: string;
  lang: SupportedLang;
  platform: Platforms;
  version: number;
  content: string;
  model_used: string;
  token_usage: number;
  status: GenerationStatus;
  created_at: string;
}

// ── UserTone ───────────────────────────────────────────────

export interface UserTone {
  id: string;
  user_id: string;
  tone_name: string;
  tone_prompt: string;
  writing_samples: string[];
  created_at: string;
}

// ── CreditUsageLog ─────────────────────────────────────────
// Replaces VideoUsage. One row per credit event (video_processing or post_generation).

export interface CreditUsageLog {
  id: string;
  user_id: string;
  yt_id: string;
  event_type: "video_processing" | "post_generation";
  platform: string | null;               // null for video_processing events
  x_format: string | null;               // null for non-X platforms
  credits_charged: number;
  video_duration_minutes: number | null;
  was_cached: boolean;
  generation_id: string | null;          // FK to generations, null for video_processing
  created_at: string;
}

// ── JobPayload ─────────────────────────────────────────────

export interface JobPayload {
  id: string;
  session_id: string;
  user_id: string;
  generation_id?: string;
  youtube_id: string;
  status: GenerationStatus;
  attempts: number;
  created_at: string;
  updated_at: string;
}

// ── Session ────────────────────────────────────────────────

export interface Session {
  id: string;
  user_id: string;
  name?: string;
  status: SessionStatus;
  pin: boolean;
  created_at: string;
}

// ── UserActivePlan ─────────────────────────────────────────

export interface UserActivePlan {
  id: string;
  user_id: string;
  plan_type: PlanType;
  payment_status: string;
  // Credit-based (pro plan)
  credits_limit: number | null;           // 120 for pro, NULL for free
  credits_used_this_month: number;        // DEFAULT 0
  credits_remaining?: number;             // computed: credits_limit - credits_used_this_month (not stored)
  // Generation-count-based (free plan)
  generations_limit: number | null;       // 2 for free, NULL for pro
  generations_used_this_month: number;    // DEFAULT 0
  // Shared
  max_video_duration_minutes: number;     // 10 for free, 90 for pro
  subscription_start?: string;
  subscription_end?: string;
  created_at: string;
  updated_at: string;
}

// ── API Error Response ─────────────────────────────────────

export interface ApiErrorResponse {
  error: string;
  message: string;
  status: number;
}
