// ═══════════════════════════════════════════════════════════
// 📁 /config/index.ts — Configuration Management
// ═══════════════════════════════════════════════════════════

// NOTE: Environment variables are loaded once at startup by src/utils/env.ts
// (via dotenv.config). Do NOT call dotenv.config() here — doing so would
// create a second load that could silently shadow already-set variables.
// All values below are read from process.env, which env.ts has already populated.

import { logger } from "../lib/logger.js";

/**
 * Queue configuration
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6
 */
export interface QueueConfig {
  // Retry configuration
  maxAttempts: number; // Default: 3
  retryDelays: number[]; // Default: [1000, 5000, 15000] (1s, 5s, 15s)
  
  // Stuck job detection
  stuckJobTimeoutMinutes: number; // Default: 5
  stuckJobDetectionIntervalSeconds: number; // Default: 60
  
  // Worker configuration
  workerPollingIntervalSeconds: number; // Default: 2
  concurrentJobsPerWorker: number; // Default: 5
  
  // Priority configuration
  priorityScores: {
    free: number; // Default: 25
    paid: number; // Default: 75
  };
  
  // pg-boss configuration
  pgBoss: {
    schema: string; // Default: 'pgboss'
    retentionDays: number; // Default: 90
    maintenanceIntervalSeconds: number; // Default: 60
    deleteAfterDays: number; // Default: 90
    expireInSeconds: number; // Default: 300 (5 minutes)
  };
}

/**
 * Database configuration
 * Requirements: 31.4
 */
export interface DatabaseConfig {
  connectionString: string;
  pool: {
    min: number; // Default: 10
    max: number; // Default: 50
    idleTimeoutMillis: number; // Default: 30000
    connectionTimeoutMillis: number; // Default: 2000
  };
}

/**
 * Cache configuration
 * Requirements: 31.5
 */
export interface CacheConfig {
  userTier: {
    ttlSeconds: number; // Default: 300 (5 minutes)
    maxSize: number; // Default: 1000
  };
  transcriptExists: {
    ttlSeconds: number; // Default: 600 (10 minutes)
    maxSize: number; // Default: 5000
  };
}

/**
 * AI Service configuration
 */
export interface AIConfig {
  gemini: {
    apiKey: string;
    model: string; // Default: 'gemini-1.5-flash'
    maxRetries: number; // Default: 3
    timeoutMs: number; // Default: 30000
  };
  claude: {
    apiKey: string;
    model: string; // Default: 'claude-3-5-sonnet-20241022'
    maxRetries: number; // Default: 3
    timeoutMs: number; // Default: 60000
  };
  costTracking: {
    enabled: boolean; // Default: true
    dailyAlertThreshold: number; // Default: 100 (USD)
  };
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  websocket: {
    enabled: boolean; // Default: true
    port: number; // Default: 3002
    pingIntervalSeconds: number; // Default: 30
  };
  email: {
    enabled: boolean; // Default: true
    batchWindowMinutes: number; // Default: 5
  };
}

/**
 * Application configuration
 */
export interface AppConfig {
  env: string;
  port: number;
  logLevel: string;
  frontendUrl: string;
  
  // Service configurations
  queue: QueueConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  ai: AIConfig;
  notification: NotificationConfig;
  
  // External services
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  transcriptApi: {
    apiKey: string;
    baseUrl: string;
  };
}

/**
 * Parse integer from environment variable with default
 */
function parseIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value for ${key}: ${value}`);
  }
  
  return parsed;
}

/**
 * Parse float from environment variable with default
 */
function parseFloatEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid float value for ${key}: ${value}`);
  }
  
  return parsed;
}

/**
 * Parse boolean from environment variable with default
 */
function parseBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Parse array of integers from comma-separated string
 */
function parseIntArrayEnv(key: string, defaultValue: number[]): number[] {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parts = value.split(",").map(s => s.trim());
  const parsed = parts.map(p => parseInt(p, 10));
  
  if (parsed.some(n => isNaN(n))) {
    throw new Error(`Invalid integer array for ${key}: ${value}`);
  }
  
  return parsed;
}

/**
 * Load and parse configuration from environment variables
 */
export function loadConfig(): AppConfig {
  return {
    // Application
    env: process.env.NODE_ENV || "development",
    port: parseIntEnv("PORT", 3000),
    logLevel: process.env.LOG_LEVEL || "info",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
    
    // Queue configuration
    queue: {
      maxAttempts: parseIntEnv("QUEUE_MAX_ATTEMPTS", 3),
      retryDelays: parseIntArrayEnv("QUEUE_RETRY_DELAYS", [1000, 5000, 15000]),
      stuckJobTimeoutMinutes: parseIntEnv("QUEUE_STUCK_JOB_TIMEOUT_MINUTES", 5),
      stuckJobDetectionIntervalSeconds: parseIntEnv("QUEUE_STUCK_JOB_DETECTION_INTERVAL_SECONDS", 60),
      workerPollingIntervalSeconds: parseIntEnv("QUEUE_WORKER_POLLING_INTERVAL_SECONDS", 2),
      concurrentJobsPerWorker: parseIntEnv("QUEUE_CONCURRENT_JOBS_PER_WORKER", 5),
      priorityScores: {
        free: parseIntEnv("QUEUE_PRIORITY_FREE", 25),
        paid: parseIntEnv("QUEUE_PRIORITY_PAID", 75),
      },
      pgBoss: {
        schema: process.env.PGBOSS_SCHEMA || "pgboss",
        retentionDays: parseIntEnv("PGBOSS_RETENTION_DAYS", 90),
        maintenanceIntervalSeconds: parseIntEnv("PGBOSS_MAINTENANCE_INTERVAL_SECONDS", 60),
        deleteAfterDays: parseIntEnv("PGBOSS_DELETE_AFTER_DAYS", 90),
        expireInSeconds: parseIntEnv("PGBOSS_EXPIRE_IN_SECONDS", 300),
      },
    },
    
    // Database configuration
    database: {
      connectionString: process.env.DATABASE_URL || "",
      pool: {
        min: parseIntEnv("DB_POOL_MIN", 10),
        max: parseIntEnv("DB_POOL_MAX", 50),
        idleTimeoutMillis: parseIntEnv("DB_POOL_IDLE_TIMEOUT_MS", 30000),
        connectionTimeoutMillis: parseIntEnv("DB_POOL_CONNECTION_TIMEOUT_MS", 2000),
      },
    },
    
    // Cache configuration
    cache: {
      userTier: {
        ttlSeconds: parseIntEnv("CACHE_USER_TIER_TTL_SECONDS", 300),
        maxSize: parseIntEnv("CACHE_USER_TIER_MAX_SIZE", 1000),
      },
      transcriptExists: {
        ttlSeconds: parseIntEnv("CACHE_TRANSCRIPT_EXISTS_TTL_SECONDS", 600),
        maxSize: parseIntEnv("CACHE_TRANSCRIPT_EXISTS_MAX_SIZE", 5000),
      },
    },
    
    // AI configuration
    ai: {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || "",
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
        maxRetries: parseIntEnv("GEMINI_MAX_RETRIES", 3),
        timeoutMs: parseIntEnv("GEMINI_TIMEOUT_MS", 30000),
      },
      claude: {
        apiKey: process.env.CLAUDE_API_KEY || "",
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        maxRetries: parseIntEnv("CLAUDE_MAX_RETRIES", 3),
        timeoutMs: parseIntEnv("CLAUDE_TIMEOUT_MS", 60000),
      },
      costTracking: {
        enabled: parseBoolEnv("AI_COST_TRACKING_ENABLED", true),
        dailyAlertThreshold: parseFloatEnv("AI_COST_DAILY_ALERT_THRESHOLD", 100),
      },
    },
    
    // Notification configuration
    notification: {
      websocket: {
        enabled: parseBoolEnv("WEBSOCKET_ENABLED", true),
        port: parseIntEnv("WEBSOCKET_PORT", 3002),
        pingIntervalSeconds: parseIntEnv("WEBSOCKET_PING_INTERVAL_SECONDS", 30),
      },
      email: {
        enabled: parseBoolEnv("EMAIL_ENABLED", true),
        batchWindowMinutes: parseIntEnv("EMAIL_BATCH_WINDOW_MINUTES", 5),
      },
    },
    
    // Supabase
    supabase: {
      url: process.env.SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
    
    // Transcript API
    transcriptApi: {
      apiKey: process.env.TRANSCRIPT_COM_API || "",
      baseUrl: process.env.TRANSCRIPT_API_BASE_URL || "https://api.transcriptapi.com",
    },
  };
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

/**
 * Log configuration (excluding sensitive values)
 */
export function logConfig(): void {
  logger.info("Configuration loaded", {
    env: config.env,
    port: config.port,
    logLevel: config.logLevel,
    queue: {
      maxAttempts: config.queue.maxAttempts,
      retryDelays: config.queue.retryDelays,
      stuckJobTimeoutMinutes: config.queue.stuckJobTimeoutMinutes,
      workerPollingIntervalSeconds: config.queue.workerPollingIntervalSeconds,
      concurrentJobsPerWorker: config.queue.concurrentJobsPerWorker,
      priorityScores: config.queue.priorityScores,
    },
    database: {
      pool: config.database.pool,
    },
    cache: config.cache,
    ai: {
      gemini: {
        model: config.ai.gemini.model,
        maxRetries: config.ai.gemini.maxRetries,
      },
      claude: {
        model: config.ai.claude.model,
        maxRetries: config.ai.claude.maxRetries,
      },
      costTracking: config.ai.costTracking,
    },
    notification: config.notification,
  });
}
