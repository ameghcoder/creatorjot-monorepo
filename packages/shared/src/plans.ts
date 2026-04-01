// ═══════════════════════════════════════════════════════════
// packages/shared/src/plans.ts — Plan & Credit Configuration
//
// Single source of truth for plan configs, credit costs, and
// video processing cost calculation. Used by both backend and frontend.
// ═══════════════════════════════════════════════════════════

// ── Plan configurations ────────────────────────────────────

export const PLAN_CREDIT_CONFIGS = {
  free: {
    generations_limit: 2,
    max_video_duration_minutes: 10,
    credits_per_month: null,
  },
  pro: {
    generations_limit: null,
    max_video_duration_minutes: 90,
    credits_per_month: 120,
  },
} as const;

// ── Generation credit costs (pro plan only) ────────────────
// Key format: "platform:format" for X, or "platform" for others

export const GENERATION_CREDIT_COSTS: Record<string, number> = {
  "x:short": 1,
  "x:long": 1,
  "x:thread": 2,
  linkedin: 2,
};

export const ALLOWED_PLATFORMS = [
  ...new Set(
    Object.entries(GENERATION_CREDIT_COSTS).map((entry) =>
      entry[0].includes(":") ? entry[0].split(":")[0] : entry[0],
    ),
  ),
];

// ── Video processing credit cost config ───────────────────
// Formula: base + ceil(max(0, duration - intervalMinutes) / intervalMinutes)

export const RICH_CONTEXT_CREDIT_COST = {
  base: 5,
  perInterval: 1,
  intervalMinutes: 10,
} as const;

// ── MVP-supported platforms ────────────────────────────────

export const MVP_SUPPORTED_PLATFORMS = ["x", "linkedin"] as const;

// ── Video processing cost helper ───────────────────────────

/**
 * Calculate the credit cost for video processing (rich_context) based on duration.
 * Formula: 5 + ceil(max(0, d - 10) / 10)
 * Examples: 0–10 min → 5, 11–20 min → 6, 21–30 min → 7, 90 min → 13
 */
export function calculateVideoProcessingCost(durationMinutes: number): number {
  return (
    RICH_CONTEXT_CREDIT_COST.base +
    Math.ceil(
      Math.max(0, durationMinutes - RICH_CONTEXT_CREDIT_COST.intervalMinutes) /
        RICH_CONTEXT_CREDIT_COST.intervalMinutes,
    )
  );
}
