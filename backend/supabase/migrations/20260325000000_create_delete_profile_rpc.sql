-- ═══════════════════════════════════════════════════════════
-- Migration: Create delete profile RPC function
-- Created at: 2026-03-25T00:00:00+00:00
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. RPC function
--    SECURITY DEFINER so it can delete from auth.users
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_profile(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_plan text;
    plan_ends timestamptz;
BEGIN
    -- 1. Fetch user's active plan status
    SELECT plan_type, subscription_end
    INTO user_plan, plan_ends
    FROM public.user_active_plan
    WHERE user_id = target_user_id;

    -- 2. Verify eligibility
    -- If they have a paid plan, verify it is expired. 
    -- If it's active (end date in future) or has no end date, block deletion.
    IF user_plan != 'free' THEN
        IF plan_ends IS NULL OR plan_ends > NOW() THEN
            RAISE EXCEPTION 'ACTIVE_PAID_PLAN';
        END IF;
    END IF;

    -- 3. Delete the user
    -- Important: This deletes the user from the central auth schema. 
    -- All associated records in public schema (sessions, transcripts, tones, etc.) 
    -- have ON DELETE CASCADE so they will automatically be cleaned up.
    DELETE FROM auth.users WHERE id = target_user_id;

    -- Return success payload
    RETURN '{"deleted": true}'::jsonb;
END;
$$;

COMMENT ON FUNCTION public.delete_user_profile(uuid) IS
    'Deletes a user profile and all cascading data if they do not have an active paid plan.';

-- ───────────────────────────────────────────────────────────
-- 2. Permissions
--    Grant execute ONLY to service_role to ensure this cannot 
--    be triggered randomly from the client anon/authenticated roles.
-- ───────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.delete_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_profile(uuid) TO service_role;
