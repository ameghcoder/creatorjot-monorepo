// ═══════════════════════════════════════════════════════════
// 📄 /middleware/error.middleware.ts — Central Error Formatter
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Catches ALL errors thrown by services/controllers and
//   converts them into a consistent JSON response format:
//   { error, message, status }
//
// HOW IT WORKS:
//   1. Services/controllers THROW errors when something fails
//   2. Express catches the error and passes it here
//   3. This middleware formats it and sends the response
//
// WHY CENTRALIZED:
//   Without this, every controller would need its own
//   try/catch with response formatting. That leads to:
//   - Inconsistent error formats across endpoints
//   - Duplicated error handling code
//   - Forgotten error cases
//
// IMPORTANT:
//   This middleware MUST be registered LAST in app.ts.
//   Express error middleware requires 4 parameters:
//   (err, req, res, next) — the 4th param tells Express
//   this is an error handler, not a regular middleware.
//
// USAGE IN app.ts:
//   ```ts
//   import { errorMiddleware } from "./middleware/error.middleware.js";
//   // Must be the LAST app.use() call
//   app.use(errorMiddleware);
//   ```
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import type { ApiErrorResponse } from "../types/index.js";

// ── Custom App Error ────────────────────────────────────
// Extend the built-in Error class so services can throw
// errors with a specific HTTP status code.
//
// USAGE in services:
//   ```ts
//   throw new AppError("Video not found", 404);
//   throw new AppError("Invalid YouTube URL", 400);
//   throw new AppError("Transcription failed", 500);
//   ```
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;

    // Preserve the class name in stack traces
    this.name = "AppError";
  }
}

// ── errorMiddleware ─────────────────────────────────────
// Express error-handling middleware.
//
// IMPORTANT: The 4 parameters are REQUIRED.
// Express identifies error middleware by its 4-param signature.
// Even if you don't use `next`, it must be in the signature.
//
// Handles two cases:
//   1. AppError → uses the statusCode from the error
//   2. Unknown error → defaults to 500 Internal Server Error
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Determine status code ───────────────────────────
  // If it's our custom AppError, use its status code.
  // Otherwise default to 500 (Internal Server Error).
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // ── Determine error type name ───────────────────────
  // Maps common status codes to readable error names.
  const errorName = getErrorName(statusCode);

  // ── Build the response ──────────────────────────────
  const response: ApiErrorResponse = {
    error: errorName,
    message: err.message || "An unexpected error occurred",
    status: statusCode,
  };

  // ── Log the error ───────────────────────────────────
  // Only log 500s as errors (actual bugs).
  // 4xx errors are expected (user mistakes) → log as warnings.
  if (statusCode >= 500) {
    logger.error("Server error", {
      status: statusCode,
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn("Client error", {
      status: statusCode,
      message: err.message,
    });
  }

  // ── Send the response ───────────────────────────────
  res.status(statusCode).json(response);
}

// ── Helper: Map status codes to error names ─────────────
// Provides human-readable error type names for common
// HTTP status codes.
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: "BadRequest",
    401: "Unauthorized",
    403: "Forbidden",
    404: "NotFound",
    409: "Conflict",
    422: "UnprocessableEntity",
    429: "TooManyRequests",
    500: "InternalServerError",
  };

  return errorNames[statusCode] ?? "UnknownError";
}
