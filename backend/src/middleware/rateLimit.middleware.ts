// ═══════════════════════════════════════════════════════════
// 📄 /middleware/rateLimit.middleware.ts — API Rate Limiting
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Protects your APIs from abuse by limiting how many
//   requests a single client can make in a time window.
//
// PREVENTS:
//   - AI cost abuse    → GPT/Speech API calls cost money
//   - YouTube spam     → yt-dlp downloads are resource-heavy
//   - Bot attacks      → automated request floods
//
// WHEN THIS MATTERS:
//   Critical after ~100 users. Before that, it's a nice-to-have.
//   But implementing it early means you won't forget when it's urgent.
//
// HOW IT WORKS:
//   Uses a simple in-memory sliding window approach.
//   Tracks request counts per IP address.
//
//   For production at scale, replace with Redis-backed
//   rate limiting (e.g., `rate-limit-redis` adapter).
//
// USAGE IN app.ts:
//   ```ts
//   import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
//   app.use(rateLimitMiddleware);
//   ```
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// ── Configuration ───────────────────────────────────────
// These values control how strict the rate limiting is.
// Adjust based on your expected traffic patterns.
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30, // Max 30 requests per window per IP
  message: "Too many requests, please try again later",
};

// ── In-Memory Store ─────────────────────────────────────
// Tracks request counts per IP address.
//
// Structure:
//   Map<ip_address, { count: number, resetTime: number }>
//
// ⚠️ LIMITATION:
//   This store lives in memory, so it resets on server restart
//   and doesn't work across multiple server instances.
//   For production, use Redis instead.
interface RateLimitEntry {
  count: number; // Number of requests in current window
  resetTime: number; // Timestamp when the window resets
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// ── Cleanup interval ────────────────────────────────────
// Periodically remove expired entries to prevent memory leaks.
// Runs every 5 minutes.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

// ── rateLimitMiddleware ─────────────────────────────────
// Express middleware that enforces request rate limits.
//
// For each incoming request:
//   1. Identify the client by IP address
//   2. Check if they've exceeded the limit
//   3. If yes → respond with 429 Too Many Requests
//   4. If no → increment counter and continue
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // ── Step 1: Identify the client ─────────────────────
  // Use X-Forwarded-For header if behind a proxy (Railway, Nginx),
  // otherwise fall back to the direct connection IP.
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown";

  const now = Date.now();

  // ── Step 2: Get or create the rate limit entry ──────
  let entry = rateLimitStore.get(clientIp);

  // If no entry exists OR the window has expired, start fresh
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    };
    rateLimitStore.set(clientIp, entry);
  }

  // ── Step 3: Increment the counter ───────────────────
  entry.count++;

  // ── Step 4: Set rate limit headers ──────────────────
  // These headers tell the client about their limits.
  // Standard RFC 6585 / draft-ietf-httpapi-ratelimit-headers.
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_CONFIG.maxRequests);
  res.setHeader(
    "X-RateLimit-Remaining",
    Math.max(0, RATE_LIMIT_CONFIG.maxRequests - entry.count),
  );
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));

  // ── Step 5: Check if limit exceeded ─────────────────
  if (entry.count > RATE_LIMIT_CONFIG.maxRequests) {
    logger.warn("Rate limit exceeded", {
      clientIp,
      count: entry.count,
      limit: RATE_LIMIT_CONFIG.maxRequests,
      path: req.path,
    });

    res.status(429).json({
      error: "TooManyRequests",
      message: RATE_LIMIT_CONFIG.message,
      status: 429,
    });
    return;
  }

  // ── Step 6: Allow the request through ───────────────
  next();
}
