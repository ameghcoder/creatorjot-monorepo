// ═══════════════════════════════════════════════════════════
// 📁 /middleware/correlationId.middleware.ts — Correlation ID Middleware
// ═══════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Correlation ID middleware
 * 
 * Adds a unique correlation ID to each request for tracing across services.
 * The correlation ID is:
 * - Generated if not provided in request headers
 * - Attached to the request object
 * - Included in response headers
 * - Available for logging throughout the request lifecycle
 * 
 * Requirement 8.2: Include correlation IDs for request tracing
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if correlation ID exists in headers
  const correlationId =
    (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    logger.generateCorrelationId();

  // Attach to request object
  (req as any).correlationId = correlationId;

  // Add to response headers
  res.setHeader("X-correlation-id", correlationId);

  // Log incoming request with correlation ID
  logger.info("Incoming request", {
    correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.headers["user-agent"],
  });

  // Continue to next middleware
  next();
}

/**
 * Helper to get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return (req as any).correlationId || "unknown";
}
