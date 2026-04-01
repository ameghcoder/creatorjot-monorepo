-- ═══════════════════════════════════════════════════════════
-- Migration: Auto-create free plan row on new user signup
-- ═══════════════════════════════════════════════════════════
--
-- When a new row is inserted into auth.users (i.e. a user signs up),
-- this trigger fires and inserts a corresponding row into
-- public.user_active_plan with the free plan defaults.
--
-- Uses ON CONFLICT DO NOTHING so re-running or replaying the trigger
-- (e.g. during local resets) never throws a duplicate key error.
-- ═══════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────
-- 1. RPC function — called by the trigger
--    SECURITY DEFINER so it can write to public.user_active_plan
--    even though it fires in the auth schema context.
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_active_plan (
        user_id,
        plan_type,
        generations_limit,
        generations_used_this_month,
        max_video_duration_minutes,
        credits_limit,
        credits_used_this_month,
        subscription_start,
        subscription_end
    )
    VALUES (
        NEW.id,         -- auth.users.id
        'free',
        2,              -- 2 generations per month on free plan
        0,
        10,             -- 10-minute video duration cap on free plan
        NULL,           -- no credits on free plan
        0,
        NOW(),          -- plan starts immediately on signup
        NULL            -- free plan never expires
    )
    ON CONFLICT (user_id) DO NOTHING;
    -- ON CONFLICT: safe to replay — won't overwrite an existing plan
    -- (e.g. if the user was already created via a seed or admin action)

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_plan() IS
    'Trigger function: inserts a free-tier user_active_plan row whenever a new auth user is created.';

-- Grant execute to postgres role (trigger runs as the definer, but explicit is safer)
GRANT EXECUTE ON FUNCTION public.handle_new_user_plan() TO service_role;


-- ───────────────────────────────────────────────────────────
-- 2. Trigger — fires AFTER INSERT on auth.users
-- ───────────────────────────────────────────────────────────

-- Drop first so this migration is idempotent (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_plan();

-- Note: COMMENT ON TRIGGER is not allowed on auth.users (not owned by postgres role)


-- ───────────────────────────────────────────────────────────
-- 3. Backfill — create plan rows for any existing users
--    who signed up before this migration ran.
-- ───────────────────────────────────────────────────────────

INSERT INTO public.user_active_plan (
    user_id,
    plan_type,
    generations_limit,
    generations_used_this_month,
    max_video_duration_minutes,
    credits_limit,
    credits_used_this_month,
    subscription_start,
    subscription_end
)
SELECT
    id,
    'free',
    2,
    0,
    10,
    NULL,
    0,
    created_at,  -- use their original signup date
    NULL
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
