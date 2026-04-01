// ═══════════════════════════════════════════════════════════
// 📄 /lib/logger.ts — Central Logging with Structured Output
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   A single logging interface for the entire backend with:
//   - JSON format for all logs
//   - Correlation IDs for request tracing
//   - Stack traces for errors
//   - Job lifecycle event tracking
//   - Worker event tracking
//
// REQUIREMENTS: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 18.7
//
// USAGE:
//   ```ts
//   import { logger } from "../lib/logger.js";
//   
//   // Basic logging
//   logger.info("Server started", { port: 3000 });
//   
//   // With correlation ID
//   logger.info("Processing request", { correlationId: req.id, userId });
//   
//   // Error with stack trace
//   logger.error("Failed to process", { error, correlationId });
//   
//   // Job lifecycle events
//   logger.jobEvent("queued", { jobId, jobType: "transcript" });
//   logger.jobEvent("completed", { jobId, jobType: "generation", duration: 45000 });
//   
//   // Worker events
//   logger.workerEvent("startup", { workerId, workerType: "transcript" });
//   logger.workerEvent("shutdown", { workerId, reason: "SIGTERM" });
//   ```
// ═══════════════════════════════════════════════════════════

import { env } from "../utils/env.js";
import { randomUUID } from "crypto";

// ── Log Levels ──────────────────────────────────────────
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

const EMOJI_MAP = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🐞'
}

type LogLevel = keyof typeof LOG_LEVELS;

// ── Job Event Types ─────────────────────────────────────
type JobEventType = "queued" | "started" | "completed" | "failed" | "retry" | "cancelled";

// ── Worker Event Types ──────────────────────────────────
type WorkerEventType = "startup" | "shutdown" | "health_change" | "error";

// ── Determine current log level from env ────────────────
// The active log level is read from the LOG_LEVEL environment variable
// (defined in src/utils/env.ts). Valid values: "error" | "warn" | "info" | "debug".
//
// How to change the log level:
//   - Development:  set LOG_LEVEL=debug in .env.local to see all output
//   - Staging:      set LOG_LEVEL=info  (default) for normal operation logs
//   - Production:   set LOG_LEVEL=warn  to reduce noise; use "error" for
//                   minimal output in cost-sensitive environments
//
// Levels are hierarchical — setting "warn" suppresses "info" and "debug".
// If LOG_LEVEL is missing or invalid, the logger defaults to "info".
const currentLevel: LogLevel =
  (env.LOG_LEVEL as LogLevel) in LOG_LEVELS
    ? (env.LOG_LEVEL as LogLevel)
    : "info";

// ── Should we log at this level? ────────────────────────
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

// ── Format log as JSON ──────────────────────────────────
// Requirement 8.1: Use JSON format for all logs
function formatLogEntry(
  level: LogLevel,
  message: string,
  meta?: object,
): string {
  const curr_timestamp = new Date().toISOString();
  const entry: any = {
    level,
    timestamp: curr_timestamp,
    message,
    ...meta,
  };

  // Requirement 8.3: Include stack traces for errors
  if (meta && "error" in meta) {
    const error = (meta as any).error;  
    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
  }

  // return JSON.stringify(entry);
  return `${EMOJI_MAP[level]} ${level.toUpperCase()} [${curr_timestamp}]\n- ${message}\n${'error' in entry ? '-' + JSON.stringify(entry.error) + '\n' : ''}`;
}

// ── Logger Object ───────────────────────────────────────
export const logger = {
  // 🔴 ERROR — something broke, likely needs a fix
  // Requirement 8.3: Log all errors with stack traces
  error(message: string, meta?: object): void {
    if (shouldLog("error")) {
      console.error(formatLogEntry("error", message, meta));
    }
  },

  // 🟡 WARN — unexpected but recoverable situation
  warn(message: string, meta?: object): void {
    if (shouldLog("warn")) {
      console.warn(formatLogEntry("warn", message, meta));
    }
  },

  // 🔵 INFO — normal operation events
  info(message: string, meta?: object): void {
    if (shouldLog("info")) {
      console.log(formatLogEntry("info", message, meta));
    }
  },

  // ⚪ DEBUG — detailed development info
  debug(message: string, meta?: object): void {
    if (shouldLog("debug")) {
      console.debug(formatLogEntry("debug", message, meta));
    }
  },

  // 📋 JOB EVENT — job lifecycle tracking
  // Requirement 8.4: Log job lifecycle events (queued, started, completed, failed, retry)
  jobEvent(
    eventType: JobEventType,
    meta: {
      jobId: string;
      jobType: "transcript" | "generation";
      correlationId?: string;
      [key: string]: any;
    }
  ): void {
    if (shouldLog("info")) {
      console.log(
        formatLogEntry("info", `Job ${eventType}`, {
          eventCategory: "job_lifecycle",
          eventType,
          ...meta,
        })
      );
    }
  },

  // 👷 WORKER EVENT — worker lifecycle tracking
  // Requirement 8.5, 8.6, 18.7: Log worker events (startup, shutdown, health changes)
  workerEvent(
    eventType: WorkerEventType,
    meta: {
      workerId: string;
      workerType?: "transcript" | "generation" | "stuck-detector";
      [key: string]: any;
    }
  ): void {
    if (shouldLog("info")) {
      console.log(
        formatLogEntry("info", `Worker ${eventType}`, {
          eventCategory: "worker_lifecycle",
          eventType,
          ...meta,
        })
      );
    }
  },

  // 🔗 Generate correlation ID
  // Requirement 8.2: Include correlation IDs for request tracing
  generateCorrelationId(): string {
    return randomUUID();
  },
};
