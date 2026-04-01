-- ═══════════════════════════════════════════════════════════
-- Migration: Atomic credit increment/decrement RPCs
-- Created at: 2026-03-26T00:00:00+00:00
--
-- Provides atomic counter mutations for user_active_plan so
-- concurrent requests never produce stale read-modify-write races.
-- ═══════════════════════════════════════════════════════════

-- ── increment_credits_used ──────────────────────────────────
-- Called by deductCredits (pro plan) before generation starts.

CREATE OR REPLACE FUNCTION public.increment_credits_used(
    p_user_id uuid,
    p_amount  numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.user_active_plan
    SET credits_used_this_month = credits_used_this_month + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.increment_credits_used(uuid, numeric) IS
    'Atomically increments credits_used_this_month for a pro user.';

GRANT EXECUTE ON FUNCTION public.increment_credits_used(uuid, numeric) TO service_role;

-- ── decrement_credits_used ──────────────────────────────────
-- Called by restoreCredits (pro plan) on generation failure.
-- Floors at 0 to prevent negative balances.

CREATE OR REPLACE FUNCTION public.decrement_credits_used(
    p_user_id uuid,
    p_amount  numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.user_active_plan
    SET credits_used_this_month = GREATEST(0, credits_used_this_month - p_amount),
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.decrement_credits_used(uuid, numeric) IS
    'Atomically decrements credits_used_this_month, floored at 0. Used for credit restoration on failure.';

GRANT EXECUTE ON FUNCTION public.decrement_credits_used(uuid, numeric) TO service_role;

-- ── decrement_generations_used ──────────────────────────────
-- Called by restoreCredits (free plan) on generation failure.
-- Floors at 0 to prevent negative counters.

CREATE OR REPLACE FUNCTION public.decrement_generations_used(
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.user_active_plan
    SET generations_used_this_month = GREATEST(0, generations_used_this_month - 1),
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.decrement_generations_used(uuid) IS
    'Atomically decrements generations_used_this_month by 1, floored at 0. Used for credit restoration on failure.';

GRANT EXECUTE ON FUNCTION public.decrement_generations_used(uuid) TO service_role;
