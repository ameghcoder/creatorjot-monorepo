-- ═══════════════════════════════════════════════════════════
-- Migration: Create payments schema and plan management RPCs
-- Created at: 2026-03-25T00:00:02+00:00
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. MODIFY USER_ACTIVE_PLAN TABLE
-- ───────────────────────────────────────────────────────────

ALTER TABLE "public"."user_active_plan"
ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'active';

COMMENT ON COLUMN "public"."user_active_plan"."payment_status" IS 'Payment status (e.g. active, pending, failed) from Dodo Payments integration.';

-- ───────────────────────────────────────────────────────────
-- 2. CREATE USER_PAYMENTS TABLE
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."user_payments" (
    "id"                uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id"           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "dodo_payment_id"   text NOT NULL,
    "amount"            numeric(10,2) NOT NULL,
    "currency"          text NOT NULL,
    "status"            text NOT NULL,
    "event_type"        text NOT NULL,
    "failure_reason"    text,
    "metadata"          jsonb,
    "plan_type"         text,
    "created_at"        timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "user_payments_dodo_payment_id_event_type_key" UNIQUE ("dodo_payment_id", "event_type")
);

COMMENT ON TABLE  "public"."user_payments"                   IS 'History of user payment events from Dodo Payments. One row per webhook event.';
COMMENT ON COLUMN "public"."user_payments"."dodo_payment_id" IS 'Payment identifier from Dodo SDK.';
COMMENT ON COLUMN "public"."user_payments"."status"          IS 'Payment status: succeeded, failed, pending, etc.';
COMMENT ON COLUMN "public"."user_payments"."event_type"      IS 'Webhook event type: payment.succeeded, payment.failed, subscription.cancelled, refund.issued, etc.';
COMMENT ON COLUMN "public"."user_payments"."failure_reason"  IS 'Dodo error message on payment failure.';
COMMENT ON COLUMN "public"."user_payments"."metadata"        IS 'Full webhook payload for debugging.';
COMMENT ON COLUMN "public"."user_payments"."plan_type"       IS 'Which plan was being purchased.';

CREATE INDEX IF NOT EXISTS "idx_user_payments_user_id" ON "public"."user_payments" ("user_id");

ALTER TABLE "public"."user_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_payments_owner_select" ON "public"."user_payments"
    FOR SELECT TO "authenticated"
    USING ((SELECT auth.uid()) = "user_id");

CREATE POLICY "user_payments_service_all" ON "public"."user_payments"
    FOR ALL TO "service_role" USING (true) WITH CHECK (true);

GRANT ALL ON TABLE "public"."user_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_payments" TO "service_role";

-- ───────────────────────────────────────────────────────────
-- 3. RPC: UPSERT_USER_PROFILE
-- ───────────────────────────────────────────────────────────
-- Upserts onboarding profile data for the currently authenticated user.
-- Called from the frontend onboarding flow via supabase.rpc().

CREATE OR REPLACE FUNCTION public.upsert_user_profile(
    p_full_name text,
    p_profession text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, profession, onboarded)
    VALUES (auth.uid(), p_full_name, p_profession, true)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name  = EXCLUDED.full_name,
        profession = EXCLUDED.profession,
        onboarded  = true,
        updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.upsert_user_profile(text, text) IS
    'Upserts profile data and sets onboarded = true. Must be called by the authenticated user.';

GRANT EXECUTE ON FUNCTION public.upsert_user_profile(text, text) TO authenticated;

-- ───────────────────────────────────────────────────────────
-- 4. RPC: SET_USER_PLAN
-- ───────────────────────────────────────────────────────────
-- Admin/service function to switch a user's plan and enforce standard limits.
-- Called internally by handle_payment_webhook on payment.succeeded.

CREATE OR REPLACE FUNCTION public.set_user_plan(
    p_user_id       uuid,
    p_plan_type     text,
    p_payment_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF p_plan_type = 'pro' THEN
        UPDATE public.user_active_plan
        SET plan_type                   = 'pro',
            payment_status              = p_payment_status,
            credits_limit               = 120,
            credits_used_this_month     = 0,
            max_video_duration_minutes  = 90,
            generations_limit           = NULL,
            subscription_end            = CASE
                                            WHEN p_payment_status = 'active'
                                            THEN now() + interval '30 days'
                                            ELSE subscription_end
                                          END,
            updated_at                  = now()
        WHERE user_id = p_user_id;
    ELSIF p_plan_type = 'free' THEN
        UPDATE public.user_active_plan
        SET plan_type                   = 'free',
            payment_status              = 'active',
            generations_limit           = 2,
            generations_used_this_month = 0,
            max_video_duration_minutes  = 10,
            credits_limit               = NULL,
            credits_used_this_month     = 0,
            subscription_end            = NULL,
            updated_at                  = now()
        WHERE user_id = p_user_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.set_user_plan(uuid, text, text) IS
    'Admin/service function to switch a user''s plan and enforce standard limits.';

GRANT EXECUTE ON FUNCTION public.set_user_plan(uuid, text, text) TO service_role;

-- ───────────────────────────────────────────────────────────
-- 5. RPC: HANDLE_PAYMENT_WEBHOOK
-- ───────────────────────────────────────────────────────────
-- Called by the Next.js webhook route on every Dodo Payments event.
-- Always inserts a new row per event so every state transition is recorded.
-- Upgrades the user to Pro on payment.succeeded.

CREATE OR REPLACE FUNCTION public.handle_payment_webhook(
    p_user_id        uuid,
    p_payment_id     text,
    p_amount         numeric,
    p_currency       text,
    p_status         text,
    p_event_type     text,
    p_failure_reason text    DEFAULT NULL,
    p_metadata       jsonb   DEFAULT NULL,
    p_plan_type      text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_payments (
        user_id,
        dodo_payment_id,
        amount,
        currency,
        status,
        event_type,
        failure_reason,
        metadata,
        plan_type
    )
    VALUES (
        p_user_id,
        p_payment_id,
        p_amount,
        p_currency,
        p_status,
        p_event_type,
        p_failure_reason,
        p_metadata,
        p_plan_type
    );

    IF p_event_type = 'payment.succeeded' THEN
        PERFORM public.set_user_plan(p_user_id, 'pro', 'active');
    END IF;
END;
$$;

COMMENT ON FUNCTION public.handle_payment_webhook(uuid, text, numeric, text, text, text, text, jsonb, text) IS
    'Webhook callback handler for Dodo Payments. Always inserts a new row per event. Upgrades user on payment.succeeded.';

GRANT EXECUTE ON FUNCTION public.handle_payment_webhook(uuid, text, numeric, text, text, text, text, jsonb, text) TO service_role;

-- ───────────────────────────────────────────────────────────
-- 6. RPC: PROCESS_EXPIRED_SUBSCRIPTIONS
-- ───────────────────────────────────────────────────────────
-- Cron job handler (scheduled via pg_cron in migration 20260325000003).
-- Downgrades Pro plans whose subscription_end has passed to the free tier.
-- Returns the number of plans downgraded.

CREATE OR REPLACE FUNCTION public.process_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_expired_count integer;
BEGIN
    WITH expired_users AS (
        UPDATE public.user_active_plan
        SET plan_type                   = 'free',
            payment_status              = 'active',
            generations_limit           = 2,
            generations_used_this_month = 0,
            max_video_duration_minutes  = 10,
            credits_limit               = NULL,
            credits_used_this_month     = 0,
            subscription_end            = NULL,
            updated_at                  = now()
        WHERE plan_type = 'pro'
          AND subscription_end IS NOT NULL
          AND subscription_end < now()
        RETURNING id
    )
    SELECT count(*) INTO v_expired_count FROM expired_users;

    RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.process_expired_subscriptions() IS
    'Cron job handler to downgrade expired Pro subscriptions to the free tier. Returns count of plans downgraded.';

GRANT EXECUTE ON FUNCTION public.process_expired_subscriptions() TO service_role;
