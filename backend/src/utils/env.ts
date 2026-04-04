import dotenv from "dotenv";

// Load .env.local for local development
dotenv.config({ path: ".env.local" });

/**
 * Centralized environment configuration.
 *
 * All environment variables are loaded here with sensible fallback defaults.
 * Import `env` anywhere in the app to get typed, auto-suggested access
 * instead of using raw `process.env.XYZ`.
 *
 * @example
 * ```ts
 * import { env } from "@/utils/env.js";
 * console.log(env.PORT); // typed & auto-completed
 * ```
 */
export const env = {
  // ── Application ───────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT) || 3000,
  HEALTH_CHECK_PORT: Number(process.env.HEALTH_CHECK_PORT) || 3001,
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3001",

  // ── Supabase ──────────────────────────────────────────
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  
  // ── Database ──────────────────────────────────────────
  DATABASE_URL: process.env.DATABASE_URL ?? "",

  // ── External APIs ─────────────────────────────────────
  TRANSCRIPT_COM_API: process.env.TRANSCRIPT_COM_API ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_API_KEY_2: process.env.GEMINI_API_KEY_2 ?? "",
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ?? "",

  // ── Queue Configuration ───────────────────────────────
  QUEUE_MAX_ATTEMPTS: Number(process.env.QUEUE_MAX_ATTEMPTS) || 3,
  QUEUE_RETRY_DELAYS: process.env.QUEUE_RETRY_DELAYS?.split(",").map(Number) || [1000, 5000, 15000],
  QUEUE_STUCK_JOB_TIMEOUT_MINUTES: Number(process.env.QUEUE_STUCK_JOB_TIMEOUT_MINUTES) || 5,
  QUEUE_STUCK_JOB_DETECTION_INTERVAL_SECONDS: Number(process.env.QUEUE_STUCK_JOB_DETECTION_INTERVAL_SECONDS) || 60,
  QUEUE_WORKER_POLLING_INTERVAL_SECONDS: Number(process.env.QUEUE_WORKER_POLLING_INTERVAL_SECONDS) || 2,
  QUEUE_CONCURRENT_JOBS_PER_WORKER: Number(process.env.QUEUE_CONCURRENT_JOBS_PER_WORKER) || 5,
  QUEUE_PRIORITY_FREE: Number(process.env.QUEUE_PRIORITY_FREE) || 25,
  QUEUE_PRIORITY_PAID: Number(process.env.QUEUE_PRIORITY_PAID) || 75,

  // ── pg-boss Configuration ─────────────────────────────
  PGBOSS_SCHEMA: process.env.PGBOSS_SCHEMA ?? "pgboss",
  PGBOSS_RETENTION_DAYS: Number(process.env.PGBOSS_RETENTION_DAYS) || 90,
  PGBOSS_MAINTENANCE_INTERVAL_SECONDS: Number(process.env.PGBOSS_MAINTENANCE_INTERVAL_SECONDS) || 60,
  PGBOSS_DELETE_AFTER_DAYS: Number(process.env.PGBOSS_DELETE_AFTER_DAYS) || 90,
  PGBOSS_EXPIRE_IN_SECONDS: Number(process.env.PGBOSS_EXPIRE_IN_SECONDS) || 300,

  // ── Database Pool Configuration ───────────────────────
  DB_POOL_MIN: Number(process.env.DB_POOL_MIN) || 10,
  DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 50,
  DB_POOL_IDLE_TIMEOUT_MS: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) || 30000,
  DB_POOL_CONNECTION_TIMEOUT_MS: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS) || 2000,

  // ── Cache Configuration ───────────────────────────────
  CACHE_USER_TIER_TTL_SECONDS: Number(process.env.CACHE_USER_TIER_TTL_SECONDS) || 300,
  CACHE_USER_TIER_MAX_SIZE: Number(process.env.CACHE_USER_TIER_MAX_SIZE) || 1000,
  CACHE_TRANSCRIPT_EXISTS_TTL_SECONDS: Number(process.env.CACHE_TRANSCRIPT_EXISTS_TTL_SECONDS) || 600,
  CACHE_TRANSCRIPT_EXISTS_MAX_SIZE: Number(process.env.CACHE_TRANSCRIPT_EXISTS_MAX_SIZE) || 5000,

  // ── AI Service Configuration ──────────────────────────
  AI_DEFAULT_MODEL: process.env.AI_DEFAULT_MODEL ?? "gemini",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
  GEMINI_MAX_RETRIES: Number(process.env.GEMINI_MAX_RETRIES) || 3,
  GEMINI_TIMEOUT_MS: Number(process.env.GEMINI_TIMEOUT_MS) || 30000,
  CLAUDE_MODEL: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022",
  CLAUDE_MAX_RETRIES: Number(process.env.CLAUDE_MAX_RETRIES) || 3,
  CLAUDE_TIMEOUT_MS: Number(process.env.CLAUDE_TIMEOUT_MS) || 60000,
  AI_COST_TRACKING_ENABLED: process.env.AI_COST_TRACKING_ENABLED === "true",
  AI_COST_DAILY_ALERT_THRESHOLD: Number(process.env.AI_COST_DAILY_ALERT_THRESHOLD) || 100,

  // ── Notification Configuration ────────────────────────
  WEBSOCKET_ENABLED: process.env.WEBSOCKET_ENABLED === "true",
  WEBSOCKET_PORT: Number(process.env.WEBSOCKET_PORT) || 3002,
  WEBSOCKET_PING_INTERVAL_SECONDS: Number(process.env.WEBSOCKET_PING_INTERVAL_SECONDS) || 30,
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === "true",
  EMAIL_BATCH_WINDOW_MINUTES: Number(process.env.EMAIL_BATCH_WINDOW_MINUTES) || 5,
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "notifications@creatorjot.com",

  // ── Testing ───────────────────────────────────────────
  TESTING_BEARER_TOKEN: process.env.TESTING_BEARER_TOKEN ?? "",

  // ── Monitoring ────────────────────────────────────────
  MONITORING_PORT: Number(process.env.MONITORING_PORT) || 9090,
} as const;

export function validateEnv(): void {
  const required: (keyof typeof env)[] = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "TRANSCRIPT_COM_API",
    "GEMINI_API_KEY",
    "CLAUDE_API_KEY",
  ];

  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n${missing.map((k) => `   • ${k}`).join("\n")}`,
    );
  }

  // Validate DATABASE_URL format
  if (env.DATABASE_URL && !env.DATABASE_URL.startsWith("postgresql://")) {
    throw new Error("❌ DATABASE_URL must be a valid PostgreSQL connection string");
  }

  console.log("✅ Environment variables validated successfully");
}

