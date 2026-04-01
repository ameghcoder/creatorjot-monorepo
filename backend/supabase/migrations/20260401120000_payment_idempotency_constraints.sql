-- ═══════════════════════════════════════════════════════════
-- Migration: Payment idempotency constraints
-- Created at: 2026-04-01T12:00:00+00:00
--
-- Changes:
--   1. Add unique constraint on user_payments.dodo_payment_id
--      (existing composite unique on (dodo_payment_id, event_type) is kept
--       for historical multi-event rows; this new constraint enables upsert
--       on conflict for idempotent payment recording)
--   2. Add optional dodo_event_id column if not already present
--      (already added in 20260330000000 — guarded with IF NOT EXISTS)
--
-- NOTE: user_refunds.dodo_refund_id UNIQUE and
--       user_disputes.dodo_dispute_id UNIQUE were already defined in
--       20260330000000_refactor_payments_schema.sql — not re-added here.
--       Index on user_payments.dodo_subscription_id also already exists.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. Unique constraint on user_payments.dodo_payment_id
--    Enables ON CONFLICT (dodo_payment_id) DO UPDATE upserts
--    for idempotent payment recording from webhooks.
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.user_payments
    DROP CONSTRAINT IF EXISTS user_payments_dodo_payment_id_unique;

ALTER TABLE public.user_payments
    ADD CONSTRAINT user_payments_dodo_payment_id_unique
    UNIQUE (dodo_payment_id);

-- ───────────────────────────────────────────────────────────
-- 2. Ensure dodo_event_id column exists (idempotency key)
--    Already added in 20260330000000 with UNIQUE — this is a
--    safety guard only.
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.user_payments
    ADD COLUMN IF NOT EXISTS dodo_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS user_payments_dodo_event_id_unique
    ON public.user_payments (dodo_event_id)
    WHERE dodo_event_id IS NOT NULL;
