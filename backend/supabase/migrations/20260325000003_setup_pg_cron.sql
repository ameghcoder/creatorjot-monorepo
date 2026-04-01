-- ═══════════════════════════════════════════════════════════
-- Migration: Setup pg_cron for subscription expirations
-- Created at: 2026-03-25T00:00:03+00:00
-- ═══════════════════════════════════════════════════════════

-- Ensure pg_cron extension is enabled 
-- (This is usually enabled by default on Supabase, but good practice to include IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the process_expired_subscriptions RPC to run every day at midnight (UTC)
-- The function name passed to cron.schedule represents the job name
SELECT cron.schedule(
    'process-expired-subscriptions-daily',
    '0 0 * * *',
    $$ SELECT public.process_expired_subscriptions(); $$
);

-- Note: To unschedule in the future, you would use:
-- SELECT cron.unschedule('process-expired-subscriptions-daily');

-- ───────────────────────────────────────────────────────────
-- Monthly usage counter reset (separate from subscription expiry)
-- Runs on the 1st of each month at midnight UTC
-- ───────────────────────────────────────────────────────────

SELECT cron.schedule(
    'reset-monthly-usage-counters',
    '0 0 1 * *',
    $$ UPDATE public.user_active_plan
       SET credits_used_this_month = 0,
           generations_used_this_month = 0; $$
);

-- Note: To unschedule in the future, you would use:
-- SELECT cron.unschedule('reset-monthly-usage-counters');
