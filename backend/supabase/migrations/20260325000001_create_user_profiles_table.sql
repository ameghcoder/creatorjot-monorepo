-- ═══════════════════════════════════════════════════════════
-- Migration: Create user_profiles table for onboarding data
-- Created at: 2026-03-25T00:00:01+00:00
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. USER_PROFILES TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id"          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    "full_name"   text,
    "profession"  text,
    "onboarded"   boolean NOT NULL DEFAULT false,
    "created_at"  timestamptz DEFAULT now() NOT NULL,
    "updated_at"  timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  "public"."user_profiles" IS 'User profile data collected during onboarding.';
COMMENT ON COLUMN "public"."user_profiles"."full_name"  IS 'User display name collected during onboarding.';
COMMENT ON COLUMN "public"."user_profiles"."profession" IS 'User profession/role collected during onboarding.';
COMMENT ON COLUMN "public"."user_profiles"."onboarded"  IS 'Whether the user has completed the onboarding flow.';

CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" ("user_id");

-- ───────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────

ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and update their own profile
CREATE POLICY "user_profiles_owner_select" ON "public"."user_profiles"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");

CREATE POLICY "user_profiles_owner_update" ON "public"."user_profiles"
    FOR UPDATE TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id")
    WITH CHECK ((SELECT auth.uid()) = "user_id");

-- Service role can do everything
CREATE POLICY "user_profiles_service_all" ON "public"."user_profiles"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────
-- 3. GRANTS
-- ───────────────────────────────────────────────────────────

GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";

-- ───────────────────────────────────────────────────────────
-- 4. TRIGGER — Auto-create profile row on new user signup
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        onboarded
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NULL),
        false
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_profile() IS
    'Trigger function: creates a user_profiles row for new signups.';

GRANT EXECUTE ON FUNCTION public.handle_new_user_profile() TO service_role;

-- Drop first so this migration is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

-- -- ───────────────────────────────────────────────────────────
-- -- 5. BACKFILL — create profile rows for existing users
-- -- ───────────────────────────────────────────────────────────

-- INSERT INTO public.user_profiles (
--     user_id,
--     full_name,
--     onboarded
-- )
-- SELECT
--     id,
--     COALESCE(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', NULL),
--     true  -- existing users are already "onboarded"
-- FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;
