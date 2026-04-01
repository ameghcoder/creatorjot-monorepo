-- ═══════════════════════════════════════════════════════════
-- 📁 Migration: Create AI Cost Tracking Table
-- ═══════════════════════════════════════════════════════════
-- Description: Creates table for tracking AI service usage and costs
-- Requirements: 34.1, 34.2, 34.3, 34.4, 34.6
-- ═══════════════════════════════════════════════════════════

-- Create ai_cost_tracking table
CREATE TABLE IF NOT EXISTS ai_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('gemini', 'claude')),
  job_id UUID NOT NULL,
  job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('transcript', 'generation')),
  token_usage INTEGER NOT NULL CHECK (token_usage >= 0),
  estimated_cost DECIMAL(10, 8) NOT NULL CHECK (estimated_cost >= 0),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day DATE GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_cost_tracking_job_id
ON ai_cost_tracking(job_id);

CREATE INDEX idx_ai_cost_tracking_timestamp
ON ai_cost_tracking(timestamp);

CREATE INDEX idx_ai_cost_tracking_provider_timestamp
ON ai_cost_tracking(provider, timestamp);

CREATE INDEX idx_ai_cost_tracking_day_provider
ON ai_cost_tracking(day, provider);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on ai_cost_tracking table
ALTER TABLE ai_cost_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for workers to insert cost tracking)
CREATE POLICY "Service role has full access to ai_cost_tracking"
ON ai_cost_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can view their own cost tracking (future feature)
-- Note: Currently no user_id column, but keeping this for future enhancement
CREATE POLICY "Users cannot access ai_cost_tracking directly"
ON ai_cost_tracking
FOR SELECT
TO authenticated
USING (false);

-- Policy: Anonymous users have no access
CREATE POLICY "Anonymous users cannot access ai_cost_tracking"
ON ai_cost_tracking
FOR ALL
TO anon
USING (false);
