-- ═══════════════════════════════════════════════════════════
-- Migration: Create queue tables for pg-boss job queue system
-- Created at: 2026-03-06
-- Description: Creates transcript_queue, generation_queue, and job_logs tables
--              for the pg-boss-based job processing system
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. ENUM TYPES FOR QUEUE SYSTEM
-- ───────────────────────────────────────────────────────────

CREATE TYPE "public"."job_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE "public"."job_type" AS ENUM ('transcript', 'generation');
CREATE TYPE "public"."job_event_type" AS ENUM ('queued', 'started', 'completed', 'failed', 'retry', 'cancelled');
CREATE TYPE "public"."platform" AS ENUM ('x', 'linkedin', 'blog', 'yt_community_post', 'facebook', 'tumblr');

-- ───────────────────────────────────────────────────────────
-- 2. TRANSCRIPT_QUEUE TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."transcript_queue" (
    "id"                    uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "yt_id"                 text NOT NULL,
    "session_id"            uuid NOT NULL REFERENCES "public"."sessions"(id) ON DELETE CASCADE,
    "status"                "public"."job_status" NOT NULL DEFAULT 'pending',
    "priority"              integer NOT NULL DEFAULT 25,
    "attempts"              integer NOT NULL DEFAULT 0,
    "max_attempts"          integer NOT NULL DEFAULT 3,
    "processing_started_at" timestamptz,
    "created_at"            timestamptz DEFAULT now() NOT NULL,
    "updated_at"            timestamptz DEFAULT now() NOT NULL,
    "error_message"         text,
    "metadata"              jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT "transcript_queue_yt_id_check" CHECK ((length(yt_id) = 11))
);

COMMENT ON TABLE  "public"."transcript_queue" IS 'Queue for transcript processing jobs using pg-boss.';
COMMENT ON COLUMN "public"."transcript_queue"."user_id" IS 'User who submitted the job.';
COMMENT ON COLUMN "public"."transcript_queue"."yt_id" IS 'YouTube video ID to process.';
COMMENT ON COLUMN "public"."transcript_queue"."session_id" IS 'Session that created this job.';
COMMENT ON COLUMN "public"."transcript_queue"."status" IS 'Job status: pending, processing, completed, failed, or cancelled.';
COMMENT ON COLUMN "public"."transcript_queue"."priority" IS 'Job priority (higher = more urgent). Paid users: 75+, Free users: 25+.';
COMMENT ON COLUMN "public"."transcript_queue"."attempts" IS 'Number of processing attempts (for retry logic).';
COMMENT ON COLUMN "public"."transcript_queue"."max_attempts" IS 'Maximum retry attempts before permanent failure.';
COMMENT ON COLUMN "public"."transcript_queue"."processing_started_at" IS 'Timestamp when job processing started (for stuck job detection).';
COMMENT ON COLUMN "public"."transcript_queue"."error_message" IS 'Error message from last failed attempt.';
COMMENT ON COLUMN "public"."transcript_queue"."metadata" IS 'Flexible JSON metadata for job parameters.';

-- Indexes for performance
CREATE INDEX "idx_transcript_queue_status" ON "public"."transcript_queue" ("status");
CREATE INDEX "idx_transcript_queue_priority" ON "public"."transcript_queue" ("priority" DESC);
CREATE INDEX "idx_transcript_queue_created_at" ON "public"."transcript_queue" ("created_at");
CREATE INDEX "idx_transcript_queue_user_id" ON "public"."transcript_queue" ("user_id");
CREATE INDEX "idx_transcript_queue_yt_id" ON "public"."transcript_queue" ("yt_id");
CREATE INDEX "idx_transcript_queue_processing" ON "public"."transcript_queue" ("status", "processing_started_at") 
    WHERE status = 'processing';

-- ───────────────────────────────────────────────────────────
-- 3. GENERATION_QUEUE TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."generation_queue" (
    "id"                    uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "transcript_id"         uuid NOT NULL REFERENCES "public"."transcript"(id) ON DELETE CASCADE,
    "session_id"            uuid NOT NULL REFERENCES "public"."sessions"(id) ON DELETE CASCADE,
    "platform"              "public"."platform" NOT NULL,
    "output_lang"           "public"."supported_lang" NOT NULL DEFAULT 'en',
    "user_tone_id"          uuid REFERENCES "public"."user_tone"(id) ON DELETE SET NULL,
    "status"                "public"."job_status" NOT NULL DEFAULT 'pending',
    "priority"              integer NOT NULL DEFAULT 25,
    "attempts"              integer NOT NULL DEFAULT 0,
    "max_attempts"          integer NOT NULL DEFAULT 3,
    "processing_started_at" timestamptz,
    "created_at"            timestamptz DEFAULT now() NOT NULL,
    "updated_at"            timestamptz DEFAULT now() NOT NULL,
    "error_message"         text,
    "metadata"              jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE  "public"."generation_queue" IS 'Queue for content generation jobs using pg-boss.';
COMMENT ON COLUMN "public"."generation_queue"."user_id" IS 'User who submitted the job.';
COMMENT ON COLUMN "public"."generation_queue"."transcript_id" IS 'Transcript to generate content from.';
COMMENT ON COLUMN "public"."generation_queue"."session_id" IS 'Session that created this job.';
COMMENT ON COLUMN "public"."generation_queue"."platform" IS 'Target platform for content generation.';
COMMENT ON COLUMN "public"."generation_queue"."output_lang" IS 'Output language for generated content.';
COMMENT ON COLUMN "public"."generation_queue"."user_tone_id" IS 'Optional user tone preferences to apply.';
COMMENT ON COLUMN "public"."generation_queue"."status" IS 'Job status: pending, processing, completed, failed, or cancelled.';
COMMENT ON COLUMN "public"."generation_queue"."priority" IS 'Job priority (higher = more urgent). Paid users: 75+, Free users: 25+.';
COMMENT ON COLUMN "public"."generation_queue"."attempts" IS 'Number of processing attempts (for retry logic).';
COMMENT ON COLUMN "public"."generation_queue"."max_attempts" IS 'Maximum retry attempts before permanent failure.';
COMMENT ON COLUMN "public"."generation_queue"."processing_started_at" IS 'Timestamp when job processing started (for stuck job detection).';
COMMENT ON COLUMN "public"."generation_queue"."error_message" IS 'Error message from last failed attempt.';
COMMENT ON COLUMN "public"."generation_queue"."metadata" IS 'Flexible JSON metadata for job parameters.';

-- Indexes for performance
CREATE INDEX "idx_generation_queue_status" ON "public"."generation_queue" ("status");
CREATE INDEX "idx_generation_queue_priority" ON "public"."generation_queue" ("priority" DESC);
CREATE INDEX "idx_generation_queue_created_at" ON "public"."generation_queue" ("created_at");
CREATE INDEX "idx_generation_queue_user_id" ON "public"."generation_queue" ("user_id");
CREATE INDEX "idx_generation_queue_transcript_id" ON "public"."generation_queue" ("transcript_id");
CREATE INDEX "idx_generation_queue_platform" ON "public"."generation_queue" ("platform");
CREATE INDEX "idx_generation_queue_processing" ON "public"."generation_queue" ("status", "processing_started_at") 
    WHERE status = 'processing';

-- ───────────────────────────────────────────────────────────
-- 4. JOB_LOGS TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."job_logs" (
    "id"            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "job_id"        uuid NOT NULL,
    "job_type"      "public"."job_type" NOT NULL,
    "event_type"    "public"."job_event_type" NOT NULL,
    "message"       text,
    "error_details" jsonb,
    "created_at"    timestamptz DEFAULT now() NOT NULL,
    "worker_id"     text
);

COMMENT ON TABLE  "public"."job_logs" IS 'Audit log for all job lifecycle events.';
COMMENT ON COLUMN "public"."job_logs"."job_id" IS 'ID of the job (from transcript_queue or generation_queue).';
COMMENT ON COLUMN "public"."job_logs"."job_type" IS 'Type of job: transcript or generation.';
COMMENT ON COLUMN "public"."job_logs"."event_type" IS 'Event type: queued, started, completed, failed, retry, or cancelled.';
COMMENT ON COLUMN "public"."job_logs"."message" IS 'Human-readable message describing the event.';
COMMENT ON COLUMN "public"."job_logs"."error_details" IS 'JSON object with error details (stack trace, context, etc.).';
COMMENT ON COLUMN "public"."job_logs"."worker_id" IS 'Identifier of the worker instance that processed the job.';

-- Indexes for querying logs
CREATE INDEX "idx_job_logs_job_id" ON "public"."job_logs" ("job_id");
CREATE INDEX "idx_job_logs_job_type" ON "public"."job_logs" ("job_type");
CREATE INDEX "idx_job_logs_event_type" ON "public"."job_logs" ("event_type");
CREATE INDEX "idx_job_logs_created_at" ON "public"."job_logs" ("created_at");

-- ───────────────────────────────────────────────────────────
-- 5. HELPER FUNCTIONS (search_path locked to '' for security)
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 
    'Trigger function to automatically update updated_at timestamp on row updates.';

-- Create triggers for updated_at columns
CREATE TRIGGER "update_transcript_queue_updated_at"
    BEFORE UPDATE ON "public"."transcript_queue"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_generation_queue_updated_at"
    BEFORE UPDATE ON "public"."generation_queue"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE FUNCTION "public"."get_user_generation_count"(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::integer
        FROM "public"."generation_queue"
        WHERE "user_id" = p_user_id
          AND "status" = 'completed'
          AND "created_at" >= date_trunc('month', CURRENT_TIMESTAMP)
    );
END;
$$;

COMMENT ON FUNCTION "public"."get_user_generation_count"(uuid) IS 
    'Returns the count of completed generation jobs for a user in the current month.';

CREATE OR REPLACE FUNCTION "public"."check_user_quota"(
    p_user_id uuid,
    p_platform text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_plan_type text;
    v_generation_count integer;
    v_result jsonb;
BEGIN
    SELECT "plan_type" INTO v_plan_type
    FROM "public"."user_active_plan"
    WHERE "user_id" = p_user_id;

    IF v_plan_type IS NULL THEN
        v_plan_type := 'free';
    END IF;

    v_generation_count := "public"."get_user_generation_count"(p_user_id);

    IF v_plan_type = 'free' THEN
        IF v_generation_count >= 2 THEN
            v_result := jsonb_build_object(
                'allowed', false,
                'reason', 'quota_exceeded',
                'message', 'Free tier limit of 2 generations per month exceeded. Please upgrade to continue.',
                'current_count', v_generation_count,
                'limit', 2
            );
            RETURN v_result;
        END IF;

        IF p_platform != 'x' THEN
            v_result := jsonb_build_object(
                'allowed', false,
                'reason', 'platform_restricted',
                'message', 'Free tier only supports Twitter/X platform. Please upgrade to access other platforms.',
                'allowed_platforms', jsonb_build_array('x')
            );
            RETURN v_result;
        END IF;
    END IF;

    v_result := jsonb_build_object(
        'allowed', true,
        'plan_type', v_plan_type,
        'current_count', v_generation_count
    );
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."check_user_quota"(uuid, text) IS 
    'Checks if user can enqueue a generation job based on their plan limits. Returns JSON with allowed status and details.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION "public"."get_user_generation_count"(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."check_user_quota"(uuid, text) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."check_user_quota"(uuid, text) TO "authenticated";
