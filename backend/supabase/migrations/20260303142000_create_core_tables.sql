-- ═══════════════════════════════════════════════════════════
-- Migration: Create core tables for CreatorJot
-- Created at: 2026-03-03T14:20:00+05:30
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ───────────────────────────────────────────────────────────

CREATE TYPE "public"."supported_lang" AS ENUM ('en', 'hi', 'es', 'de');
CREATE TYPE "public"."transcript_source" AS ENUM ('api', 'stt');
CREATE TYPE "public"."generation_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "public"."input_type" AS ENUM ('youtube', 'prompt', 'url', 'file');
CREATE TYPE "public"."session_status" AS ENUM ('active', 'archived', 'inactive', 'trashed');

-- ───────────────────────────────────────────────────────────
-- 2. TRANSCRIPT TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."transcript" (
    "id"                  uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "yt_id"               text NOT NULL,
    "short_summary"       jsonb DEFAULT '{}'::jsonb ,
    "lang"                "public"."supported_lang" NOT NULL DEFAULT 'en',
    "url"                 text NOT NULL,
    "duration"            numeric(10,2),                    -- video length in seconds (supports decimals)
    "transcript_source"   "public"."transcript_source" NOT NULL DEFAULT 'api',
    "created_at"          timestamptz DEFAULT now() NOT NULL,
    constraint transcript_yt_id_key unique (yt_id),
    constraint transcript_yt_id_check check ((length(yt_id) = 11))
);

COMMENT ON TABLE  "public"."transcript" IS 'Stores YouTube video transcripts and metadata.';
COMMENT ON COLUMN "public"."transcript"."yt_id" IS 'YouTube video ID.';
COMMENT ON COLUMN "public"."transcript"."url" IS 'URL to the transcript file in storage.';
COMMENT ON COLUMN "public"."transcript"."duration" IS 'YouTube video length in seconds (supports decimal values like 180.5).';

CREATE INDEX "idx_transcript_yt_id" ON "public"."transcript" ("yt_id");

-- ───────────────────────────────────────────────────────────
-- 3. USER_TONE TABLE  (before payloads, since payloads references it)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."user_tone" (
    "id"                uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "tone_name"         text NOT NULL,
    "tone_prompt"       text NOT NULL,
    "writing_samples"   jsonb DEFAULT '[]'::jsonb,
    "created_at"        timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  "public"."user_tone" IS 'Custom writing tones defined by users.';
COMMENT ON COLUMN "public"."user_tone"."writing_samples" IS 'JSON array of sample texts reflecting this tone.';

CREATE INDEX "idx_user_tone_user_id" ON "public"."user_tone" ("user_id");

-- ───────────────────────────────────────────────────────────
-- 4. SESSIONS TABLE (before payloads and generations, since they reference it)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id"          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "status"      "public"."session_status" NOT NULL DEFAULT 'active',           -- 'active' or 'archive'
    "pin"         boolean NOT NULL DEFAULT false,
    "created_at"  timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  "public"."sessions" IS 'User chat sessions similar to ChatGPT sessions.';
COMMENT ON COLUMN "public"."sessions"."status" IS 'Session status: active, inactive, trash or archive.';
COMMENT ON COLUMN "public"."sessions"."pin" IS 'Whether the session is pinned by the user.';

CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" ("user_id");
CREATE INDEX "idx_sessions_status"  ON "public"."sessions" ("status");

-- ───────────────────────────────────────────────────────────
-- 5. PAYLOADS TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."payloads" (
    "id"              uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "input_type"      "public"."input_type" NOT NULL DEFAULT 'youtube',
    "yt_id"           text,
    "prompt_text"     text,
    "output_lang"     "public"."supported_lang" NOT NULL DEFAULT 'en',
    "session_id"      uuid NOT NULL REFERENCES "public"."sessions"(id) ON DELETE CASCADE,
    "user_tone_id"    uuid REFERENCES "public"."user_tone"(id) ON DELETE SET NULL,
    "settings"        jsonb DEFAULT '{}'::jsonb,
    "created_at"      timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "payloads_input_check" CHECK (
        (input_type = 'youtube' AND yt_id IS NOT NULL) OR
        (input_type = 'prompt' AND prompt_text IS NOT NULL) OR
        (input_type = 'url' AND yt_id IS NOT NULL) OR
        (input_type = 'file' AND yt_id IS NOT NULL)
    )
);

COMMENT ON TABLE  "public"."payloads" IS 'Generation requests submitted by users.';
COMMENT ON COLUMN "public"."payloads"."input_type" IS 'Type of input: youtube, prompt, url, or file.';
COMMENT ON COLUMN "public"."payloads"."yt_id" IS 'YouTube video ID (for youtube input type) or URL/file path (for url/file types).';
COMMENT ON COLUMN "public"."payloads"."prompt_text" IS 'User prompt text (for prompt input type).';
COMMENT ON COLUMN "public"."payloads"."settings" IS 'Flexible JSON settings for the generation request.';

CREATE INDEX "idx_payloads_user_id" ON "public"."payloads" ("user_id");
CREATE INDEX "idx_payloads_yt_id"   ON "public"."payloads" ("yt_id");
CREATE INDEX "idx_payloads_input_type" ON "public"."payloads" ("input_type");

-- ───────────────────────────────────────────────────────────
-- 6. GENERATIONS TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."generations" (
    "id"            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "payload_id"    uuid NOT NULL REFERENCES "public"."payloads"(id) ON DELETE CASCADE,
    "user_id"       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "session_id"    uuid NOT NULL REFERENCES "public"."sessions"(id) ON DELETE CASCADE,
    "lang"          "public"."supported_lang" NOT NULL DEFAULT 'en',
    "platform"      text NOT NULL,                         -- e.g. twitter, linkedin, instagram
    "version"       integer NOT NULL DEFAULT 1,
    "content"       text,
    "model_used"    text,                                  -- cost debugging later
    "token_usage"   integer,                               -- cost tracking per user
    "status"        "public"."generation_status" NOT NULL DEFAULT 'pending',
    "created_at"    timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  "public"."generations" IS 'Generated content per platform from a payload.';
COMMENT ON COLUMN "public"."generations"."session_id" IS 'Session that created this generation.';
COMMENT ON COLUMN "public"."generations"."platform" IS 'Target platform (twitter, linkedin, instagram, etc.).';
COMMENT ON COLUMN "public"."generations"."model_used" IS 'LLM model identifier for cost debugging.';
COMMENT ON COLUMN "public"."generations"."token_usage" IS 'Total tokens consumed for cost tracking.';

CREATE INDEX "idx_generations_payload_id" ON "public"."generations" ("payload_id");
CREATE INDEX "idx_generations_user_id"    ON "public"."generations" ("user_id");
CREATE INDEX "idx_generations_session_id" ON "public"."generations" ("session_id");

-- ───────────────────────────────────────────────────────────
-- 7. USER_ACTIVE_PLAN TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."user_active_plan" (
    "id"                          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"                     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    "plan_type"                   text NOT NULL DEFAULT 'free',  -- 'free' or 'pro'
    "credits_limit"               integer,                       -- 120 for pro, NULL for free
    "credits_used_this_month"     integer NOT NULL DEFAULT 0,
    "generations_limit"           integer,                       -- 2 for free, NULL for pro
    "generations_used_this_month" integer NOT NULL DEFAULT 0,
    "max_video_duration_minutes"  integer NOT NULL DEFAULT 10,   -- 10 for free, 90 for pro
    "subscription_start"          timestamptz,
    "subscription_end"            timestamptz,
    "created_at"                  timestamptz DEFAULT now() NOT NULL,
    "updated_at"                  timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  "public"."user_active_plan" IS 'User subscription plans and usage limits.';
COMMENT ON COLUMN "public"."user_active_plan"."plan_type" IS 'Subscription tier: free or pro.';
COMMENT ON COLUMN "public"."user_active_plan"."credits_limit" IS '120 for pro plan, NULL for free plan.';
COMMENT ON COLUMN "public"."user_active_plan"."credits_used_this_month" IS 'Credits consumed this billing period (pro only). credits_remaining is computed as credits_limit - credits_used_this_month.';
COMMENT ON COLUMN "public"."user_active_plan"."generations_limit" IS '2 for free plan, NULL for pro plan.';
COMMENT ON COLUMN "public"."user_active_plan"."generations_used_this_month" IS 'Generations used this billing period (free only).';
COMMENT ON COLUMN "public"."user_active_plan"."max_video_duration_minutes" IS 'Maximum video duration in minutes: 10 for free, 90 for pro.';

CREATE INDEX "idx_user_active_plan_user_id" ON "public"."user_active_plan" ("user_id");
CREATE INDEX "idx_user_active_plan_plan_type" ON "public"."user_active_plan" ("plan_type");

-- ───────────────────────────────────────────────────────────
-- 8. JOBS TABLE (Job Queue for Worker)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id"            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "session_id"    uuid NOT NULL REFERENCES "public"."sessions"(id) ON DELETE CASCADE,
    "user_id"       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "generation_id" uuid REFERENCES "public"."generations"(id) ON DELETE SET NULL,
    "youtube_id"    text NOT NULL,
    "status"        "public"."generation_status" NOT NULL DEFAULT 'pending',
    "attempts"      integer NOT NULL DEFAULT 0,
    "created_at"    timestamptz DEFAULT now() NOT NULL,
    "updated_at"    timestamptz DEFAULT now() NOT NULL,
    UNIQUE("session_id")  -- One job per session
);

COMMENT ON TABLE  "public"."jobs" IS 'Job queue for background worker processing.';
COMMENT ON COLUMN "public"."jobs"."session_id" IS 'Session that created this job.';
COMMENT ON COLUMN "public"."jobs"."generation_id" IS 'Associated generation (if completed).';
COMMENT ON COLUMN "public"."jobs"."youtube_id" IS 'YouTube video ID to process.';
COMMENT ON COLUMN "public"."jobs"."status" IS 'Job status: pending, processing, completed, or failed.';
COMMENT ON COLUMN "public"."jobs"."attempts" IS 'Number of processing attempts (for retry logic).';

CREATE INDEX "idx_jobs_session_id" ON "public"."jobs" ("session_id");
CREATE INDEX "idx_jobs_user_id"    ON "public"."jobs" ("user_id");
CREATE INDEX "idx_jobs_status"     ON "public"."jobs" ("status");
CREATE INDEX "idx_jobs_created_at" ON "public"."jobs" ("created_at");

-- ───────────────────────────────────────────────────────────
-- 9. CREDIT_USAGE_LOG TABLE (replaces video_usage)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."credit_usage_log" (
    "id"                      uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "yt_id"                   text NOT NULL,
    "event_type"              text NOT NULL CHECK (event_type IN ('video_processing', 'post_generation')),
    "platform"                text,                        -- NULL for video_processing events
    "x_format"                text,                        -- NULL for non-X platforms
    "credits_charged"         integer NOT NULL,
    "video_duration_minutes"  numeric,
    "was_cached"              boolean NOT NULL,
    "generation_id"           uuid REFERENCES "public"."generations"(id) ON DELETE SET NULL,  -- NULL for video_processing
    "created_at"              timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  "public"."credit_usage_log" IS 'Per-event credit activity log for billing and usage display.';
COMMENT ON COLUMN "public"."credit_usage_log"."event_type" IS 'video_processing or post_generation.';
COMMENT ON COLUMN "public"."credit_usage_log"."platform" IS 'Target platform; NULL for video_processing events.';
COMMENT ON COLUMN "public"."credit_usage_log"."x_format" IS 'X post format (short/long/thread); NULL for non-X platforms.';
COMMENT ON COLUMN "public"."credit_usage_log"."credits_charged" IS '0 if cached video processing; otherwise the credit cost.';
COMMENT ON COLUMN "public"."credit_usage_log"."was_cached" IS 'true if video processing result was served from cache.';
COMMENT ON COLUMN "public"."credit_usage_log"."generation_id" IS 'FK to generations table; NULL for video_processing events.';

CREATE INDEX "idx_credit_usage_log_user_id" ON "public"."credit_usage_log" ("user_id");
CREATE INDEX "idx_credit_usage_log_yt_id"   ON "public"."credit_usage_log" ("yt_id");

-- ───────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────

ALTER TABLE "public"."transcript"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_tone"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payloads"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."generations"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_active_plan"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."jobs"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."credit_usage_log"  ENABLE ROW LEVEL SECURITY;

-- Transcript: service_role only (backend writes transcripts)
CREATE POLICY "transcript_service_insert" ON "public"."transcript"
    FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "transcript_service_select" ON "public"."transcript"
    FOR SELECT TO "service_role" USING (true);
CREATE POLICY "transcript_service_update" ON "public"."transcript"
    FOR UPDATE TO "service_role" USING (true);

-- User Tone: users can manage their own tones
CREATE POLICY "user_tone_owner_all" ON "public"."user_tone"
    FOR ALL TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id")
    WITH CHECK ((SELECT auth.uid()) = "user_id");
CREATE POLICY "user_tone_service_all" ON "public"."user_tone"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- Payloads: users can read their own, service_role can do everything
CREATE POLICY "payloads_owner_select" ON "public"."payloads"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");
CREATE POLICY "payloads_owner_insert" ON "public"."payloads"
    FOR INSERT TO "authenticated"
    WITH CHECK ((SELECT auth.uid()) = "user_id");
CREATE POLICY "payloads_service_all" ON "public"."payloads"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- Generations: users can read their own, service_role can do everything
CREATE POLICY "generations_owner_select" ON "public"."generations"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");
CREATE POLICY "generations_owner_delete" ON "public"."generations"
    FOR DELETE TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");
CREATE POLICY "generations_service_all" ON "public"."generations"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- Credit Usage Log: authenticated users can read their own rows; service_role full access
CREATE POLICY "credit_usage_log_owner_select" ON "public"."credit_usage_log"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");
CREATE POLICY "credit_usage_log_service_all" ON "public"."credit_usage_log"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- Sessions: users can manage their own sessions
CREATE POLICY "sessions_owner_all" ON "public"."sessions"
    FOR ALL TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id")
    WITH CHECK ((SELECT auth.uid()) = "user_id");
CREATE POLICY "sessions_service_all" ON "public"."sessions"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- User Active Plan: users can read their own plan, service_role can do everything
CREATE POLICY "user_active_plan_owner_select" ON "public"."user_active_plan"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");
CREATE POLICY "user_active_plan_service_all" ON "public"."user_active_plan"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- Jobs: users can read their own jobs, service_role can do everything
CREATE POLICY "jobs_owner_select" ON "public"."jobs"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");
CREATE POLICY "jobs_service_all" ON "public"."jobs"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────
-- 11. GRANTS
-- ───────────────────────────────────────────────────────────

GRANT ALL ON TABLE "public"."transcript"  TO "authenticated";
GRANT ALL ON TABLE "public"."transcript"  TO "service_role";

GRANT ALL ON TABLE "public"."user_tone"   TO "authenticated";
GRANT ALL ON TABLE "public"."user_tone"   TO "service_role";

GRANT ALL ON TABLE "public"."payloads"    TO "authenticated";
GRANT ALL ON TABLE "public"."payloads"    TO "service_role";

GRANT ALL ON TABLE "public"."generations" TO "authenticated";
GRANT ALL ON TABLE "public"."generations" TO "service_role";

GRANT ALL ON TABLE "public"."credit_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_usage_log" TO "service_role";

GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";

GRANT ALL ON TABLE "public"."user_active_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_plan" TO "service_role";

GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";

-- ───────────────────────────────────────────────────────────
-- 12. POSTGRES FUNCTION FOR ATOMIC JOB LOCKING
-- ───────────────────────────────────────────────────────────

-- This function is used by the worker to atomically fetch and lock
-- a pending job. It prevents race conditions where multiple workers
-- might try to process the same job.
--
-- The function:
-- 1. Finds the oldest pending job with attempts < 3
-- 2. Locks it using FOR UPDATE SKIP LOCKED (prevents race conditions)
-- 3. Updates its status to 'processing'
-- 4. Returns the locked job
--
-- Called by: worker.ts → fetchAndLockJob()

CREATE OR REPLACE FUNCTION "public"."fetch_and_lock_job"()
RETURNS SETOF "public"."jobs"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE "public"."jobs"
  SET 
    "status" = 'processing',
    "updated_at" = NOW()
  WHERE "id" = (
    SELECT "id" 
    FROM "public"."jobs"
    WHERE "status" = 'pending' 
      AND "attempts" < 3
    ORDER BY "created_at" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

COMMENT ON FUNCTION "public"."fetch_and_lock_job"() IS 
  'Atomically fetches and locks a pending job for worker processing. Prevents race conditions.';

-- Grant execute permission to service_role (used by the worker)
GRANT EXECUTE ON FUNCTION "public"."fetch_and_lock_job"() TO "service_role";
