-- ═══════════════════════════════════════════════════════════
-- Migration: Billing identity and deletion registry tables
-- Created at: 2026-03-30T00:00:01+00:00
--
-- Changes:
--   1. Create billing_identity_log — permanent billing history (never deleted)
--   2. Create deleted_account_registry — billing snapshot at account deletion
--   3. Add indexes on email and dodo_customer_id for both tables
--   4. Alter user_profiles — add is_refund_eligible, risk_flag, refund_count
--
-- NOTE: user_active_plan subscription columns (cancel_at_period_end,
--       dodo_subscription_id, next_billing_date, billing_interval,
--       renewal_count) were already added in migration 20260330000000.
--       Do NOT re-add them here.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. CREATE billing_identity_log
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.billing_identity_log (
    id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id                 uuid,
    email                   text        NOT NULL,
    dodo_customer_id        text,
    total_paid              numeric(10, 2) NOT NULL DEFAULT 0,
    total_refunded          numeric(10, 2) NOT NULL DEFAULT 0,
    total_disputes          integer     NOT NULL DEFAULT 0,
    total_credits_used      integer     NOT NULL DEFAULT 0,
    refund_count            integer     NOT NULL DEFAULT 0,
    account_created_at      timestamptz,
    account_deleted_at      timestamptz,
    last_subscription_plan  text,
    is_flagged              boolean     NOT NULL DEFAULT false,
    flag_reason             text,
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT billing_identity_log_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE  public.billing_identity_log                          IS 'Permanent billing identity record per user. Survives account deletion — never deleted or anonymised.';
COMMENT ON COLUMN public.billing_identity_log.user_id                 IS 'auth.users id — nullable because the account may have been deleted.';
COMMENT ON COLUMN public.billing_identity_log.email                   IS 'User email — primary lookup key across account lifecycles.';
COMMENT ON COLUMN public.billing_identity_log.dodo_customer_id        IS 'DodoPayments customer ID for cross-referencing payment processor records.';
COMMENT ON COLUMN public.billing_identity_log.total_paid              IS 'Cumulative amount paid across all billing periods.';
COMMENT ON COLUMN public.billing_identity_log.total_refunded          IS 'Cumulative amount refunded.';
COMMENT ON COLUMN public.billing_identity_log.total_disputes          IS 'Total number of disputes raised.';
COMMENT ON COLUMN public.billing_identity_log.total_credits_used      IS 'Total AI generation credits consumed across all billing periods.';
COMMENT ON COLUMN public.billing_identity_log.refund_count            IS 'Number of refunds issued to this identity.';
COMMENT ON COLUMN public.billing_identity_log.account_created_at      IS 'Timestamp of the most recent account creation for this email.';
COMMENT ON COLUMN public.billing_identity_log.account_deleted_at      IS 'Timestamp of account deletion, if applicable.';
COMMENT ON COLUMN public.billing_identity_log.last_subscription_plan  IS 'Plan type at the time of last known activity.';
COMMENT ON COLUMN public.billing_identity_log.is_flagged              IS 'True when this identity has been flagged for abuse (e.g. prior refund on deletion).';
COMMENT ON COLUMN public.billing_identity_log.flag_reason             IS 'Human-readable reason for the flag.';
COMMENT ON COLUMN public.billing_identity_log.updated_at              IS 'Last time this row was modified.';

CREATE INDEX IF NOT EXISTS idx_billing_identity_log_email
    ON public.billing_identity_log (email);

CREATE INDEX IF NOT EXISTS idx_billing_identity_log_dodo_customer_id
    ON public.billing_identity_log (dodo_customer_id);

-- ───────────────────────────────────────────────────────────
-- 2. CREATE deleted_account_registry
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.deleted_account_registry (
    id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
    original_user_id        uuid        NOT NULL,
    email                   text        NOT NULL,
    dodo_customer_id        text,
    total_refunds_issued    integer     NOT NULL DEFAULT 0,
    total_amount_refunded   numeric(10, 2) NOT NULL DEFAULT 0,
    had_active_plan         boolean     NOT NULL DEFAULT false,
    credits_used_at_delete  integer     NOT NULL DEFAULT 0,
    deleted_at              timestamptz NOT NULL DEFAULT now(),
    flagged                 boolean     NOT NULL DEFAULT false,
    flag_reason             text,
    CONSTRAINT deleted_account_registry_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE  public.deleted_account_registry                          IS 'Snapshot of billing state captured at the moment of account deletion. Used to detect abuse on re-signup. Never deleted.';
COMMENT ON COLUMN public.deleted_account_registry.original_user_id        IS 'The auth.users id that was deleted.';
COMMENT ON COLUMN public.deleted_account_registry.email                   IS 'Email of the deleted account — used to match returning users on re-signup.';
COMMENT ON COLUMN public.deleted_account_registry.dodo_customer_id        IS 'DodoPayments customer ID at time of deletion.';
COMMENT ON COLUMN public.deleted_account_registry.total_refunds_issued    IS 'Number of refunds the user received before deleting.';
COMMENT ON COLUMN public.deleted_account_registry.total_amount_refunded   IS 'Total monetary amount refunded before deletion.';
COMMENT ON COLUMN public.deleted_account_registry.had_active_plan         IS 'Whether the user had an active paid plan at deletion time.';
COMMENT ON COLUMN public.deleted_account_registry.credits_used_at_delete  IS 'Credits consumed in the current billing period at deletion time.';
COMMENT ON COLUMN public.deleted_account_registry.deleted_at              IS 'Timestamp when the account was deleted.';
COMMENT ON COLUMN public.deleted_account_registry.flagged                 IS 'True when this deletion record is flagged for abuse prevention.';
COMMENT ON COLUMN public.deleted_account_registry.flag_reason             IS 'Human-readable reason for the flag.';

CREATE INDEX IF NOT EXISTS idx_deleted_account_registry_email
    ON public.deleted_account_registry (email);

CREATE INDEX IF NOT EXISTS idx_deleted_account_registry_dodo_customer_id
    ON public.deleted_account_registry (dodo_customer_id);

-- ───────────────────────────────────────────────────────────
-- 3. RLS — billing_identity_log
--    service_role: full access
--    authenticated users: no direct access
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.billing_identity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_identity_log_service_all" ON public.billing_identity_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.billing_identity_log TO service_role;

-- ───────────────────────────────────────────────────────────
-- 4. RLS — deleted_account_registry
--    service_role: full access
--    authenticated users: no direct access
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.deleted_account_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deleted_account_registry_service_all" ON public.deleted_account_registry
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.deleted_account_registry TO service_role;

-- ───────────────────────────────────────────────────────────
-- 5. ALTER user_profiles — add refund eligibility columns
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS is_refund_eligible boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS risk_flag          text,
    ADD COLUMN IF NOT EXISTS refund_count       integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_profiles.is_refund_eligible IS 'False when the user has already requested a refund, received one, or has been flagged as a returning abuser.';
COMMENT ON COLUMN public.user_profiles.risk_flag          IS 'Optional risk label set by the abuse prevention system (e.g. previous_refund_history).';
COMMENT ON COLUMN public.user_profiles.refund_count       IS 'Number of refunds issued to this user account.';
