-- ═══════════════════════════════════════════════════════════
-- Migration: Add name column to sessions table
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "public"."sessions" 
ADD COLUMN IF NOT EXISTS "name" text;

COMMENT ON COLUMN "public"."sessions"."name" IS 'Optional custom name for the session, e.g., the YouTube video title.';
