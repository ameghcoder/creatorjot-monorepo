import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type { UserActivePlan } from "@creatorjot/shared";

/**
 * Fetches the full UserActivePlan for a user, computing credits_remaining.
 * If no plan record exists, provisions a free plan automatically.
 */
export async function getUserActivePlan(userId: string): Promise<UserActivePlan> {
  const { data, error } = await supabase
    .from("user_active_plan")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Failed to fetch user active plan", { userId, error: error.message });
    throw new Error("Failed to fetch user plan");
  }

  if (data) {
    const plan = data as UserActivePlan;
    if (plan.credits_limit !== null) {
      plan.credits_remaining = plan.credits_limit - plan.credits_used_this_month;
    }
    return plan;
  }

  // No plan found — provision a free plan automatically
  logger.info("No plan found for user, creating free plan", { userId });

  const { error: insertError } = await supabase
    .from("user_active_plan")
    .insert({ user_id: userId })
    .single();

  if (insertError) {
    logger.warn("Failed to create free plan (may already exist)", { userId, error: insertError.message });
  }

  // Re-fetch after insert
  const { data: newPlan, error: refetchError } = await supabase
    .from("user_active_plan")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (refetchError || !newPlan) {
    logger.error("Failed to re-fetch plan after provisioning", { userId });
    throw new Error("Failed to provision user plan");
  }

  return newPlan as UserActivePlan;
}

/**
 * Thin wrapper for backward compatibility with queue priority logic.
 * Returns "free" or "paid" based on plan_type.
 */
export async function getUserTier(userId: string): Promise<"free" | "paid"> {
  try {
    const plan = await getUserActivePlan(userId);
    return plan.plan_type === "free" ? "free" : "paid";
  } catch (err) {
    logger.error("Unexpected error in getUserTier, defaulting to free", { error: err, userId });
    return "free";
  }
}
