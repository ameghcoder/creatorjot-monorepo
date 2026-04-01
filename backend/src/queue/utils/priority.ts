// ═══════════════════════════════════════════════════════════
// 📁 /queue/utils/priority.ts — Priority Calculation Logic
// ═══════════════════════════════════════════════════════════

import type { UserTier } from "../types.js";

/**
 * Calculate job priority based on user tier and job age
 * 
 * Priority scoring:
 * - Paid users: base priority 75
 * - Free users: base priority 25
 * - Age factor: up to 25 additional points for older jobs (1 hour = max bonus)
 * 
 * Total priority range: 25-100
 * 
 * @param userTier - User's subscription tier
 * @param jobAge - Age of the job in seconds (optional, defaults to 0)
 * @returns Priority score (25-100)
 */
export function calculatePriority(
  userTier: UserTier,
  jobAge: number = 0
): number {
  // Base priority based on user tier
  const basePriority = userTier === "free" ? 25 : 75;

  // Age factor: max 25 points for jobs older than 1 hour (3600 seconds)
  // Linear scaling: 0 seconds = 0 points, 3600+ seconds = 25 points
  const ageFactor = Math.min(jobAge / 3600, 1) * 25;

  // Total priority capped at 100
  const totalPriority = Math.min(basePriority + ageFactor, 100);

  return Math.round(totalPriority);
}

/**
 * Get base priority for a user tier without age factor
 * 
 * @param userTier - User's subscription tier
 * @returns Base priority score
 */
export function getBasePriority(userTier: UserTier): number {
  return userTier === "paid" ? 75 : 25;
}

/**
 * Calculate age factor for priority calculation
 * 
 * @param jobAge - Age of the job in seconds
 * @returns Age factor (0-25)
 */
export function calculateAgeFactor(jobAge: number): number {
  return Math.min(jobAge / 3600, 1) * 25;
}
