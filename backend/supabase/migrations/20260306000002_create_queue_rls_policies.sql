-- ═══════════════════════════════════════════════════════════
-- Migration: Row Level Security policies for queue tables
-- Created at: 2026-03-06
-- Description: Creates RLS policies for transcript_queue, generation_queue,
--              and job_logs tables to ensure proper access control
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. ENABLE ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────

ALTER TABLE "public"."transcript_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."generation_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."job_logs" ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────
-- 2. TRANSCRIPT_QUEUE RLS POLICIES
-- ───────────────────────────────────────────────────────────

-- Users can view their own transcript queue jobs
CREATE POLICY "transcript_queue_owner_select" ON "public"."transcript_queue"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");

-- Users can insert their own transcript queue jobs
CREATE POLICY "transcript_queue_owner_insert" ON "public"."transcript_queue"
    FOR INSERT TO "authenticated"
    WITH CHECK ((SELECT auth.uid()) = "user_id");

-- Users can update their own transcript queue jobs (for cancellation)
CREATE POLICY "transcript_queue_owner_update" ON "public"."transcript_queue"
    FOR UPDATE TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id")
    WITH CHECK ((SELECT auth.uid()) = "user_id");

-- Service role has full access (for workers)
CREATE POLICY "transcript_queue_service_all" ON "public"."transcript_queue"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- ───────────────────────────────────────────────────────────
-- 3. GENERATION_QUEUE RLS POLICIES
-- ───────────────────────────────────────────────────────────

-- Users can view their own generation queue jobs
CREATE POLICY "generation_queue_owner_select" ON "public"."generation_queue"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");

-- Users can insert their own generation queue jobs
CREATE POLICY "generation_queue_owner_insert" ON "public"."generation_queue"
    FOR INSERT TO "authenticated"
    WITH CHECK ((SELECT auth.uid()) = "user_id");

-- Users can update their own generation queue jobs (for cancellation)
CREATE POLICY "generation_queue_owner_update" ON "public"."generation_queue"
    FOR UPDATE TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id")
    WITH CHECK ((SELECT auth.uid()) = "user_id");

-- Service role has full access (for workers)
CREATE POLICY "generation_queue_service_all" ON "public"."generation_queue"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- ───────────────────────────────────────────────────────────
-- 4. JOB_LOGS RLS POLICIES
-- ───────────────────────────────────────────────────────────

-- Users can view logs for their own jobs
-- Note: This requires joining with the queue tables to check ownership
CREATE POLICY "job_logs_owner_select" ON "public"."job_logs"
    FOR SELECT TO "authenticated"
    USING (
        CASE 
            WHEN "job_type" = 'transcript' THEN
                EXISTS (
                    SELECT 1 FROM "public"."transcript_queue"
                    WHERE "transcript_queue"."id" = "job_logs"."job_id"
                      AND "transcript_queue"."user_id" = (SELECT auth.uid())
                )
            WHEN "job_type" = 'generation' THEN
                EXISTS (
                    SELECT 1 FROM "public"."generation_queue"
                    WHERE "generation_queue"."id" = "job_logs"."job_id"
                      AND "generation_queue"."user_id" = (SELECT auth.uid())
                )
            ELSE false
        END
    );

-- Service role has full access (for workers to write logs)
CREATE POLICY "job_logs_service_all" ON "public"."job_logs"
    FOR ALL TO "service_role"
    USING (true)
    WITH CHECK (true);

-- ───────────────────────────────────────────────────────────
-- 5. GRANTS
-- ───────────────────────────────────────────────────────────

GRANT ALL ON TABLE "public"."transcript_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."transcript_queue" TO "service_role";

GRANT ALL ON TABLE "public"."generation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_queue" TO "service_role";

GRANT ALL ON TABLE "public"."job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."job_logs" TO "service_role";
