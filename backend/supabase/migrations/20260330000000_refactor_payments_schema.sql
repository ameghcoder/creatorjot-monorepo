-- ═══════════════════════════════════════════════════════════
-- Migration: Refactor payments schema for full webhook coverage
-- Created at: 2026-03-30T00:00:00+00:00
--
-- Changes:
--   1. Drop handle_payment_webhook RPC (replaced by direct inserts in webhook route)
--   2. Alter user_active_plan — add subscription tracking columns
--   3. Alter user_payments — add subscription/billing/idempotency columns
--   4. Create user_subscriptions — subscription event history table
--   5. Create user_refunds — refund event history table
--   6. Create user_disputes — dispute event history table
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. DROP handle_payment_webhook RPC
-- ───────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.handle_payment_webhook(uuid, text, numeric, text, text, text, text, jsonb, text);

-- ───────────────────────────────────────────────────────────
-- 2. ALTER user_active_plan
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.user_active_plan
    ADD COLUMN IF NOT EXISTS dodo_subscription_id  text UNIQUE,
    ADD COLUMN IF NOT EXISTS dodo_product_id        text,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end   boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS next_billing_date       timestamptz,
    ADD COLUMN IF NOT EXISTS billing_interval        text,
    ADD COLUMN IF NOT EXISTS renewal_count           integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_active_plan.dodo_subscription_id IS 'Dodo subscription ID — used to look up the user on every subscription webhook.';
COMMENT ON COLUMN public.user_active_plan.dodo_product_id      IS 'Dodo product/price ID for the active plan.';
COMMENT ON COLUMN public.user_active_plan.cancel_at_period_end IS 'True when user cancelled but retains access until subscription_end.';
COMMENT ON COLUMN public.user_active_plan.next_billing_date    IS 'Next scheduled billing date (mirrors subscription_end for active subs).';
COMMENT ON COLUMN public.user_active_plan.billing_interval     IS 'Billing interval: Day, Week, Month, Year.';
COMMENT ON COLUMN public.user_active_plan.renewal_count        IS 'Number of successful renewals for this subscription.';

CREATE INDEX IF NOT EXISTS idx_user_active_plan_dodo_sub_id
    ON public.user_active_plan (dodo_subscription_id);

-- ───────────────────────────────────────────────────────────
-- 3. ALTER user_payments
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.user_payments
    ADD COLUMN IF NOT EXISTS dodo_subscription_id  text,
    ADD COLUMN IF NOT EXISTS billing_period_start   timestamptz,
    ADD COLUMN IF NOT EXISTS billing_period_end     timestamptz,
    ADD COLUMN IF NOT EXISTS payment_method         text,
    ADD COLUMN IF NOT EXISTS payment_method_last4   text,
    ADD COLUMN IF NOT EXISTS dodo_event_id          text UNIQUE;

COMMENT ON COLUMN public.user_payments.dodo_subscription_id IS 'Subscription this payment belongs to (null for one-time payments).';
COMMENT ON COLUMN public.user_payments.billing_period_start IS 'Start of the billing period this payment covers.';
COMMENT ON COLUMN public.user_payments.billing_period_end   IS 'End of the billing period this payment covers.';
COMMENT ON COLUMN public.user_payments.payment_method       IS 'Payment method type: card, upi, etc.';
COMMENT ON COLUMN public.user_payments.payment_method_last4 IS 'Last 4 digits of the card (if applicable).';
COMMENT ON COLUMN public.user_payments.dodo_event_id        IS 'Dodo internal event ID — unique constraint prevents duplicate processing.';

CREATE INDEX IF NOT EXISTS idx_user_payments_dodo_sub_id
    ON public.user_payments (dodo_subscription_id);

-- ───────────────────────────────────────────────────────────
-- 4. CREATE user_subscriptions (subscription event history)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id                   uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL,
    dodo_subscription_id text NOT NULL,
    dodo_product_id      text,
    event_type           text NOT NULL,
    status               text NOT NULL,
    plan_type            text NOT NULL,
    amount               numeric(10, 2),
    currency             text,
    period_start         timestamptz,
    period_end           timestamptz,
    previous_plan        text,
    new_plan             text,
    raw_payload          jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT user_subscriptions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.user_subscriptions                        IS 'Full history of subscription lifecycle events from Dodo webhooks.';
COMMENT ON COLUMN public.user_subscriptions.event_type            IS 'Webhook event: subscription.active, renewed, updated, plan_changed, on_hold, failed, cancelled, expired.';
COMMENT ON COLUMN public.user_subscriptions.status                IS 'Subscription status at the time of the event.';
COMMENT ON COLUMN public.user_subscriptions.previous_plan         IS 'Previous plan type (populated on plan_changed events).';
COMMENT ON COLUMN public.user_subscriptions.new_plan              IS 'New plan type (populated on plan_changed events).';
COMMENT ON COLUMN public.user_subscriptions.raw_payload           IS 'Full webhook payload snapshot for debugging.';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
    ON public.user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dodo_sub_id
    ON public.user_subscriptions (dodo_subscription_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_owner_select" ON public.user_subscriptions
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_subscriptions_service_all" ON public.user_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_subscriptions TO authenticated;
GRANT ALL ON TABLE public.user_subscriptions TO service_role;

-- ───────────────────────────────────────────────────────────
-- 5. CREATE user_refunds
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_refunds (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL,
    dodo_refund_id  text NOT NULL UNIQUE,
    dodo_payment_id text NOT NULL,
    amount          numeric(10, 2) NOT NULL,
    currency        text NOT NULL,
    reason          text,
    status          text NOT NULL,
    access_revoked  boolean NOT NULL DEFAULT false,
    raw_payload     jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_refunds_pkey PRIMARY KEY (id),
    CONSTRAINT user_refunds_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.user_refunds                    IS 'Refund events received from Dodo webhooks.';
COMMENT ON COLUMN public.user_refunds.dodo_payment_id   IS 'Links to user_payments.dodo_payment_id.';
COMMENT ON COLUMN public.user_refunds.access_revoked    IS 'True when this refund triggered a plan downgrade to free.';
COMMENT ON COLUMN public.user_refunds.raw_payload       IS 'Full webhook payload snapshot for debugging.';

CREATE INDEX IF NOT EXISTS idx_user_refunds_user_id
    ON public.user_refunds (user_id);
CREATE INDEX IF NOT EXISTS idx_user_refunds_dodo_payment_id
    ON public.user_refunds (dodo_payment_id);

ALTER TABLE public.user_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_refunds_owner_select" ON public.user_refunds
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_refunds_service_all" ON public.user_refunds
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_refunds TO authenticated;
GRANT ALL ON TABLE public.user_refunds TO service_role;

-- ───────────────────────────────────────────────────────────
-- 6. CREATE user_disputes
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_disputes (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL,
    dodo_dispute_id  text NOT NULL UNIQUE,
    dodo_payment_id  text NOT NULL,
    amount           numeric(10, 2) NOT NULL,
    currency         text NOT NULL,
    reason           text,
    status           text NOT NULL,
    access_paused    boolean NOT NULL DEFAULT false,
    opened_at        timestamptz,
    resolved_at      timestamptz,
    raw_payload      jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_disputes_pkey PRIMARY KEY (id),
    CONSTRAINT user_disputes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.user_disputes                   IS 'Dispute events received from Dodo webhooks.';
COMMENT ON COLUMN public.user_disputes.dodo_payment_id  IS 'Links to user_payments.dodo_payment_id.';
COMMENT ON COLUMN public.user_disputes.access_paused    IS 'True while dispute is open and access is temporarily paused.';
COMMENT ON COLUMN public.user_disputes.opened_at        IS 'Timestamp of dispute.opened event.';
COMMENT ON COLUMN public.user_disputes.resolved_at      IS 'Timestamp when dispute reached a terminal state.';
COMMENT ON COLUMN public.user_disputes.raw_payload      IS 'Full webhook payload snapshot for debugging.';

CREATE INDEX IF NOT EXISTS idx_user_disputes_user_id
    ON public.user_disputes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_disputes_dodo_payment_id
    ON public.user_disputes (dodo_payment_id);

ALTER TABLE public.user_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_disputes_owner_select" ON public.user_disputes
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_disputes_service_all" ON public.user_disputes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_disputes TO authenticated;
GRANT ALL ON TABLE public.user_disputes TO service_role;
