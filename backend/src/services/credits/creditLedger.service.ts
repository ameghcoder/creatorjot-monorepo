// ═══════════════════════════════════════════════════════════
// backend/src/services/credits/creditLedger.service.ts
//
// Handles credit deduction, restoration, and usage logging.
// All DB mutations are atomic single-row updates.
// ═══════════════════════════════════════════════════════════

import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";
import type { UserActivePlan, CreditUsageLog } from "@creatorjot/shared";

// ── Types ───────────────────────────────────────────────────

export type CreditUsageLogInsert = Omit<CreditUsageLog, "id" | "created_at">;

// ── deductCredits ───────────────────────────────────────────

/**
 * Atomically increments the usage counter for the user's plan type:
 * - Pro: increments credits_used_this_month by cost
 * - Free: increments generations_used_this_month by 1 (cost is always 0 for free)
 */
export async function deductCredits(
  userId: string,
  cost: number,
  plan: UserActivePlan,
): Promise<void> {
  if (plan.plan_type === "pro") {
    const { error } = await supabase.rpc("increment_credits_used", {
      p_user_id: userId,
      p_amount: cost,
    });

    if (error) {
      // Fallback: direct update if RPC not available
      const { error: updateError } = await supabase
        .from("user_active_plan")
        .update({
          credits_used_this_month: plan.credits_used_this_month + cost,
        })
        .eq("user_id", userId);

      if (updateError) {
        logger.error("Failed to deduct credits", { userId, cost, error: updateError.message });
        throw new Error("Failed to deduct credits");
      }
    }
  } else {
    // Free plan: increment generation counter by 1
    const { error } = await supabase
      .from("user_active_plan")
      .update({
        generations_used_this_month: plan.generations_used_this_month + 1,
      })
      .eq("user_id", userId);

    if (error) {
      logger.error("Failed to increment generation counter", { userId, error: error.message });
      throw new Error("Failed to increment generation counter");
    }
  }
}

// ── restoreCredits ──────────────────────────────────────────

/**
 * Reverses a prior deduction on generation failure.
 * Prefers atomic RPCs to avoid stale read-modify-write races.
 * Falls back to a direct update (floored at 0) if the RPC doesn't exist yet.
 * Logs a high-severity alert if the restore itself fails (manual reconciliation needed).
 */
export async function restoreCredits(
  userId: string,
  cost: number,
  plan: UserActivePlan,
): Promise<void> {
  try {
    if (plan.plan_type === "pro") {
      const { error: rpcError } = await supabase.rpc("decrement_credits_used", {
        p_user_id: userId,
        p_amount: cost,
      });

      if (rpcError) {
        // RPC not available — fall back to direct update, floor at 0
        const { error } = await supabase
          .from("user_active_plan")
          .update({ credits_used_this_month: Math.max(0, plan.credits_used_this_month - cost) })
          .eq("user_id", userId);
        if (error) throw error;
      }
    } else {
      const { error: rpcError } = await supabase.rpc("decrement_generations_used", {
        p_user_id: userId,
      });

      if (rpcError) {
        // RPC not available — fall back to direct update, floor at 0
        const { error } = await supabase
          .from("user_active_plan")
          .update({ generations_used_this_month: Math.max(0, plan.generations_used_this_month - 1) })
          .eq("user_id", userId);
        if (error) throw error;
      }
    }
  } catch (err) {
    // High-severity: user was charged for a failed generation — needs manual reconciliation
    logger.error("CRITICAL: Failed to restore credits after generation failure", {
      userId,
      cost,
      planType: plan.plan_type,
      error: err,
      alert: "MANUAL_RECONCILIATION_REQUIRED",
    });
  }
}

// ── logCreditEvent ──────────────────────────────────────────

/**
 * Inserts a row into credit_usage_log for every credit event
 * (video_processing or post_generation).
 */
export async function logCreditEvent(event: CreditUsageLogInsert): Promise<void> {
  const { error } = await supabase.from("credit_usage_log").insert(event);

  if (error) {
    // Non-fatal: log the failure but don't throw — generation already completed
    logger.error("Failed to log credit event", { event, error: error.message });
  }
}
