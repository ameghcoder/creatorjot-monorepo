import { PLAN_CREDIT_CONFIGS } from "@creatorjot/shared";

// AI processing duration limits per tier (seconds) — derived from shared plan config
export const AI_DURATION_LIMITS = {
  free: PLAN_CREDIT_CONFIGS.free.max_video_duration_minutes * 60,
  paid: PLAN_CREDIT_CONFIGS.pro.max_video_duration_minutes * 60,
} as const;
