-- ═══════════════════════════════════════════════════════════
-- 📁 Migration: Enable pg-boss Schema
-- ═══════════════════════════════════════════════════════════
-- Description: Creates pgboss schema and grants permissions for pg-boss to manage its tables
-- Requirements: 1.1, 1.2
-- ═══════════════════════════════════════════════════════════

-- Create pgboss schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS pgboss;

-- Grant usage and creation permissions to postgres role
GRANT USAGE ON SCHEMA pgboss TO postgres;
GRANT CREATE ON SCHEMA pgboss TO postgres;
GRANT ALL ON SCHEMA pgboss TO postgres;

-- Grant permissions on all current and future tables/sequences in pgboss schema
GRANT ALL ON ALL TABLES IN SCHEMA pgboss TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgboss TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA pgboss TO postgres;

-- Set default privileges for future objects created by pg-boss
ALTER DEFAULT PRIVILEGES IN SCHEMA pgboss GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgboss GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgboss GRANT ALL ON FUNCTIONS TO postgres;

-- Also grant to service_role for backend access
GRANT USAGE ON SCHEMA pgboss TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pgboss TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgboss TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgboss GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgboss GRANT ALL ON SEQUENCES TO service_role;

-- Add comment
COMMENT ON SCHEMA pgboss IS 'Schema for pg-boss job queue system - managed automatically by pg-boss library';
