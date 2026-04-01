-- ═══════════════════════════════════════════════════════════
-- 📁 Migration: Add focal_key_point_sequence to generation_queue
-- ═══════════════════════════════════════════════════════════
-- Description: Allows a generation job to be anchored to a specific key point
--              from the transcript. When set, the AI generates a post focused
--              on that key point while using the full transcript as context.
--              NULL means auto-select the best key point (existing behaviour).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE generation_queue
  ADD COLUMN IF NOT EXISTS focal_key_point_sequence INTEGER DEFAULT NULL;
