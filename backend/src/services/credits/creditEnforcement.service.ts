// ═══════════════════════════════════════════════════════════
// backend/src/services/credits/creditEnforcement.service.ts
//
// Enforces plan limits before any generation is processed.
// Reads UserActivePlan from DB and validates against plan rules.
// ═══════════════════════════════════════════════════════════

import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../middleware/error.middleware.js";
import {
  MVP_SUPPORTED_PLATFORMS,
  PLAN_CREDIT_CONFIGS,
  GENERATION_CREDIT_COSTS,
  calculateVideoProcessingCost,
} from "@creatorjot/shared";
import type { UserActivePlan } from "@creatorjot/shared";

// ── getUserActivePlan ───────────────────────────────────────

/**
 * Fetches the user's active plan from DB and computes credits_remaining.
 * Throws 404 if no plan record exists.
 */
export async function getUserActivePlan(userId: string): Promise<UserActivePlan> {
  const { data, error } = await supabase
    .from("user_active_plan")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    logger.error("Failed to fetch user active plan", { userId, error: error?.message });
    throw new AppError("User plan not found", 404);
  }

  const plan = data as UserActivePlan;

  // Compute credits_remaining (not stored in DB)
  if (plan.credits_limit !== null) {
    plan.credits_remaining = plan.credits_limit - plan.credits_used_this_month;
  }

  return plan;
}

// ── validatePlatformSupport ─────────────────────────────────

/**
 * Throws 400 if the platform is not in MVP_SUPPORTED_PLATFORMS.
 */
export function validatePlatformSupport(platform: string): void {
  const supported = MVP_SUPPORTED_PLATFORMS as readonly string[];
  if (!supported.includes(platform)) {
    throw new AppError(`Platform '${platform}' is not available.`, 400);
  }
}

// ── validateFreeUserRequest ─────────────────────────────────

/**
 * Validates a free user's generation request.
 * Enforces: x-short-only format, generation limit, and 10-min duration cap.
 */
export function validateFreeUserRequest(
  plan: UserActivePlan,
  platform: string,
  xFormat: string | undefined,
  durationMinutes: number,
): void {
  // Duration cap
  const maxDuration = PLAN_CREDIT_CONFIGS.free.max_video_duration_minutes;
  if (durationMinutes > maxDuration) {
    throw new AppError(
      `Videos longer than ${maxDuration} minutes require a Pro plan.`,
      400,
    );
  }

  // Format restriction: only x/short allowed
  if (platform !== "x" || xFormat !== "short") {
    throw new AppError("This format is not available on the Free plan.", 403);
  }

  // Generation limit
  const limit = plan.generations_limit ?? PLAN_CREDIT_CONFIGS.free.generations_limit;
  if (plan.generations_used_this_month >= limit) {
    throw new AppError(
      "Monthly generation limit reached. Upgrade to Pro for more.",
      402,
    );
  }
}

// ── validateProUserRequest ──────────────────────────────────

/**
 * Validates a pro user's generation request.
 * Enforces: 90-min duration cap and sufficient credit balance.
 */
export function validateProUserRequest(
  plan: UserActivePlan,
  totalCost: number,
  durationMinutes: number,
): void {
  // Duration cap
  const maxDuration = PLAN_CREDIT_CONFIGS.pro.max_video_duration_minutes;
  if (durationMinutes > maxDuration) {
    throw new AppError(
      `Videos longer than ${maxDuration} minutes are not supported.`,
      400,
    );
  }

  const creditsRemaining = plan.credits_remaining ?? 0;

  if (creditsRemaining <= 0) {
    throw new AppError(
      "Monthly credit limit reached. Your credits reset at the start of next month.",
      402,
    );
  }

  if (totalCost > creditsRemaining) {
    throw new AppError(
      `Insufficient credits. This generation costs ${totalCost} credits, you have ${creditsRemaining} remaining.`,
      402,
    );
  }
}

// ── computeTotalCost ────────────────────────────────────────

/**
 * Computes the total credit cost for a generation request.
 * Free users always cost 0 (absorbed internally).
 * Pro users pay: video processing cost (if not cached) + generation credit cost.
 */
export function computeTotalCost(
  plan: UserActivePlan,
  platform: string,
  xFormat: string | undefined,
  durationMinutes: number,
  isVideoCached: boolean,
): number {
  if (plan.plan_type === "free") {
    return 0;
  }

  // Video processing cost (only if not cached)
  const videoCost = isVideoCached ? 0 : calculateVideoProcessingCost(durationMinutes);

  // Generation credit cost
  const generationKey = platform === "x" && xFormat ? `x:${xFormat}` : platform;
  const generationCost = GENERATION_CREDIT_COSTS[generationKey] ?? 0;

  return videoCost + generationCost;
}
