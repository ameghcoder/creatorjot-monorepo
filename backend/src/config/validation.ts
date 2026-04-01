// ═══════════════════════════════════════════════════════════
// 📁 /config/validation.ts — Environment Validation
// ═══════════════════════════════════════════════════════════

import { config } from "./index.js";
import { logger } from "../lib/logger.js";

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate required environment variables
 * Requirements: 22.7
 */
export function validateRequiredEnvVars(): void {
  const errors: string[] = [];
  
  // Required Supabase variables
  if (!config.supabase.url) {
    errors.push("SUPABASE_URL is required");
  }
  if (!config.supabase.serviceRoleKey) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is required");
  }
  
  // Required database connection
  if (!config.database.connectionString) {
    errors.push("DATABASE_URL is required");
  }
  
  // Required API keys
  if (!config.transcriptApi.apiKey) {
    errors.push("TRANSCRIPT_COM_API is required");
  }
  if (!config.ai.gemini.apiKey) {
    errors.push("GEMINI_API_KEY is required");
  }
  if (!config.ai.claude.apiKey) {
    errors.push("CLAUDE_API_KEY is required");
  }
  
  if (errors.length > 0) {
    throw new ValidationError(
      "Missing required environment variables",
      errors
    );
  }
}

/**
 * Validate database connection string format
 * Requirements: 22.7
 */
export function validateDatabaseConnectionString(): void {
  const errors: string[] = [];
  const connStr = config.database.connectionString;
  
  if (!connStr) {
    errors.push("DATABASE_URL is empty");
    throw new ValidationError("Invalid database configuration", errors);
  }
  
  // Check for postgresql:// or postgres:// prefix
  if (!connStr.startsWith("postgresql://") && !connStr.startsWith("postgres://")) {
    errors.push("DATABASE_URL must start with postgresql:// or postgres://");
  }
  
  // Check for basic structure (user:pass@host:port/database)
  const urlPattern = /^postgres(ql)?:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+/;
  if (!urlPattern.test(connStr)) {
    errors.push("DATABASE_URL format is invalid (expected: postgresql://user:pass@host:port/database)");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Invalid database connection string", errors);
  }
}

/**
 * Validate API keys format
 * Requirements: 22.7
 */
export function validateApiKeys(): void {
  const errors: string[] = [];
  
  // Validate Transcript API key
  if (config.transcriptApi.apiKey.length < 10) {
    errors.push("TRANSCRIPT_COM_API appears to be invalid (too short)");
  }
  
  // Validate Gemini API key (should start with 'AI')
  if (!config.ai.gemini.apiKey.startsWith("AI")) {
    errors.push("GEMINI_API_KEY appears to be invalid (should start with 'AI')");
  }
  
  // Validate Claude API key (should start with 'sk-ant-')
  if (!config.ai.claude.apiKey.startsWith("sk-ant-")) {
    errors.push("CLAUDE_API_KEY appears to be invalid (should start with 'sk-ant-')");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Invalid API keys", errors);
  }
}

/**
 * Validate queue configuration values
 * Requirements: 22.7
 */
export function validateQueueConfig(): void {
  const errors: string[] = [];
  const queueConfig = config.queue;
  
  // Validate max attempts
  if (queueConfig.maxAttempts < 1 || queueConfig.maxAttempts > 10) {
    errors.push("QUEUE_MAX_ATTEMPTS must be between 1 and 10");
  }
  
  // Validate retry delays
  if (queueConfig.retryDelays.length === 0) {
    errors.push("QUEUE_RETRY_DELAYS must contain at least one delay value");
  }
  if (queueConfig.retryDelays.some(d => d < 0)) {
    errors.push("QUEUE_RETRY_DELAYS must contain only positive values");
  }
  
  // Validate stuck job timeout
  if (queueConfig.stuckJobTimeoutMinutes < 1 || queueConfig.stuckJobTimeoutMinutes > 60) {
    errors.push("QUEUE_STUCK_JOB_TIMEOUT_MINUTES must be between 1 and 60");
  }
  
  // Validate detection interval
  if (queueConfig.stuckJobDetectionIntervalSeconds < 10 || queueConfig.stuckJobDetectionIntervalSeconds > 600) {
    errors.push("QUEUE_STUCK_JOB_DETECTION_INTERVAL_SECONDS must be between 10 and 600");
  }
  
  // Validate worker polling interval
  if (queueConfig.workerPollingIntervalSeconds < 1 || queueConfig.workerPollingIntervalSeconds > 60) {
    errors.push("QUEUE_WORKER_POLLING_INTERVAL_SECONDS must be between 1 and 60");
  }
  
  // Validate concurrent jobs
  if (queueConfig.concurrentJobsPerWorker < 1 || queueConfig.concurrentJobsPerWorker > 20) {
    errors.push("QUEUE_CONCURRENT_JOBS_PER_WORKER must be between 1 and 20");
  }
  
  // Validate priority scores
  if (queueConfig.priorityScores.free < 0 || queueConfig.priorityScores.free > 100) {
    errors.push("QUEUE_PRIORITY_FREE must be between 0 and 100");
  }
  if (queueConfig.priorityScores.paid < 0 || queueConfig.priorityScores.paid > 100) {
    errors.push("QUEUE_PRIORITY_PAID must be between 0 and 100");
  }
  if (queueConfig.priorityScores.free >= queueConfig.priorityScores.paid) {
    errors.push("QUEUE_PRIORITY_PAID must be greater than QUEUE_PRIORITY_FREE");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Invalid queue configuration", errors);
  }
}

/**
 * Validate database pool configuration
 * Requirements: 22.7
 */
export function validateDatabasePoolConfig(): void {
  const errors: string[] = [];
  const poolConfig = config.database.pool;
  
  // Validate min/max connections
  if (poolConfig.min < 1) {
    errors.push("DB_POOL_MIN must be at least 1");
  }
  if (poolConfig.max < poolConfig.min) {
    errors.push("DB_POOL_MAX must be greater than or equal to DB_POOL_MIN");
  }
  if (poolConfig.max > 100) {
    errors.push("DB_POOL_MAX should not exceed 100");
  }
  
  // Validate timeouts
  if (poolConfig.idleTimeoutMillis < 1000) {
    errors.push("DB_POOL_IDLE_TIMEOUT_MS must be at least 1000");
  }
  if (poolConfig.connectionTimeoutMillis < 1000) {
    errors.push("DB_POOL_CONNECTION_TIMEOUT_MS must be at least 1000");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Invalid database pool configuration", errors);
  }
}

/**
 * Validate cache configuration
 * Requirements: 22.7
 */
export function validateCacheConfig(): void {
  const errors: string[] = [];
  const cacheConfig = config.cache;
  
  // Validate user tier cache
  if (cacheConfig.userTier.ttlSeconds < 60 || cacheConfig.userTier.ttlSeconds > 3600) {
    errors.push("CACHE_USER_TIER_TTL_SECONDS must be between 60 and 3600");
  }
  if (cacheConfig.userTier.maxSize < 100 || cacheConfig.userTier.maxSize > 10000) {
    errors.push("CACHE_USER_TIER_MAX_SIZE must be between 100 and 10000");
  }
  
  // Validate transcript exists cache
  if (cacheConfig.transcriptExists.ttlSeconds < 60 || cacheConfig.transcriptExists.ttlSeconds > 3600) {
    errors.push("CACHE_TRANSCRIPT_EXISTS_TTL_SECONDS must be between 60 and 3600");
  }
  if (cacheConfig.transcriptExists.maxSize < 100 || cacheConfig.transcriptExists.maxSize > 50000) {
    errors.push("CACHE_TRANSCRIPT_EXISTS_MAX_SIZE must be between 100 and 50000");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Invalid cache configuration", errors);
  }
}

/**
 * Validate AI service configuration
 * Requirements: 22.7
 */
export function validateAIConfig(): void {
  const errors: string[] = [];
  const aiConfig = config.ai;
  
  // Validate Gemini config
  if (aiConfig.gemini.maxRetries < 0 || aiConfig.gemini.maxRetries > 10) {
    errors.push("GEMINI_MAX_RETRIES must be between 0 and 10");
  }
  if (aiConfig.gemini.timeoutMs < 5000 || aiConfig.gemini.timeoutMs > 120000) {
    errors.push("GEMINI_TIMEOUT_MS must be between 5000 and 120000");
  }
  
  // Validate Claude config
  if (aiConfig.claude.maxRetries < 0 || aiConfig.claude.maxRetries > 10) {
    errors.push("CLAUDE_MAX_RETRIES must be between 0 and 10");
  }
  if (aiConfig.claude.timeoutMs < 5000 || aiConfig.claude.timeoutMs > 180000) {
    errors.push("CLAUDE_TIMEOUT_MS must be between 5000 and 180000");
  }
  
  // Validate cost tracking
  if (aiConfig.costTracking.dailyAlertThreshold < 0) {
    errors.push("AI_COST_DAILY_ALERT_THRESHOLD must be non-negative");
  }
  
  if (errors.length > 0) {
    throw new ValidationError("Invalid AI configuration", errors);
  }
}

/**
 * Validate all configuration
 * Requirements: 22.7
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  try {
    validateRequiredEnvVars();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  try {
    validateDatabaseConnectionString();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  try {
    validateApiKeys();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  try {
    validateQueueConfig();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  try {
    validateDatabasePoolConfig();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  try {
    validateCacheConfig();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  try {
    validateAIConfig();
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(...error.errors);
    }
  }
  
  if (errors.length > 0) {
    logger.error("Configuration validation failed", { errors });
    console.error("\n❌ Configuration validation failed:\n");
    errors.forEach((error, index) => {
      console.error(`   ${index + 1}. ${error}`);
    });
    console.error("\n");
    
    throw new ValidationError(
      `Configuration validation failed with ${errors.length} error(s)`,
      errors
    );
  }
  
  logger.info("Configuration validation passed");
}
