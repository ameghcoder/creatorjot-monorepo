-- ═══════════════════════════════════════════════════════════
-- 📁 Migration: Make ai_cost_tracking.job_id nullable
-- ═══════════════════════════════════════════════════════════
-- Description: GeminiClient is called directly (not via a job) for transcript
--              summarisation and rich context extraction. These calls have no
--              real job UUID, so job_id must allow NULL.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE ai_cost_tracking ALTER COLUMN job_id DROP NOT NULL;
