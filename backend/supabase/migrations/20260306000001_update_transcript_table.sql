-- ═══════════════════════════════════════════════════════════
-- Migration: Update transcript table for job queue system
-- Created at: 2026-03-06
-- Description: Adds key_points and summary_generated_at fields to transcript table
--              for storing AI-generated summaries and key points
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. ADD NEW COLUMNS TO TRANSCRIPT TABLE
-- ───────────────────────────────────────────────────────────

-- Add key_points column to store array of key insights from transcript
ALTER TABLE "public"."transcript"
ADD COLUMN IF NOT EXISTS "key_points" jsonb DEFAULT '[]'::jsonb;

-- Add summary_generated_at timestamp to track when summary was created
ALTER TABLE "public"."transcript"
ADD COLUMN IF NOT EXISTS "summary_generated_at" timestamptz;

COMMENT ON COLUMN "public"."transcript"."key_points" IS 
    'JSON array of 3-7 key points extracted from the transcript by AI.';
COMMENT ON COLUMN "public"."transcript"."summary_generated_at" IS 
    'Timestamp when the summary and key points were generated.';

-- ───────────────────────────────────────────────────────────
-- 2. ADD INDEXES FOR KEY_POINTS QUERIES
-- ───────────────────────────────────────────────────────────

-- GIN index for efficient JSONB queries on key_points
CREATE INDEX IF NOT EXISTS "idx_transcript_key_points" 
    ON "public"."transcript" USING GIN ("key_points");

-- Index for filtering transcripts with generated summaries
CREATE INDEX IF NOT EXISTS "idx_transcript_summary_generated" 
    ON "public"."transcript" ("summary_generated_at") 
    WHERE "summary_generated_at" IS NOT NULL;

-- ───────────────────────────────────────────────────────────
-- 3. ADD CHECK CONSTRAINT FOR KEY_POINTS VALIDATION
-- ───────────────────────────────────────────────────────────

-- Ensure key_points is always a JSON array
ALTER TABLE "public"."transcript"
ADD CONSTRAINT "transcript_key_points_is_array" 
    CHECK (jsonb_typeof("key_points") = 'array');

-- ───────────────────────────────────────────────────────────
-- 4. UPDATE EXISTING ROWS
-- ───────────────────────────────────────────────────────────

-- Set default empty array for existing rows that might have NULL
UPDATE "public"."transcript"
SET "key_points" = '[]'::jsonb
WHERE "key_points" IS NULL;
