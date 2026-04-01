-- Migration: Add rich_context columns to transcript table
-- Feature: content-generation-quality

ALTER TABLE transcript
  ADD COLUMN IF NOT EXISTS rich_context JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rich_context_extracted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_transcript_rich_context_null
  ON transcript (id)
  WHERE rich_context IS NULL;
