// ═══════════════════════════════════════════════════════════
// 📄 /middleware/auth.middleware.ts — Authentication Middleware
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Verifies JWT tokens from incoming requests.
//   If valid, attaches the user info to `req.user`.
//   If invalid, rejects with 401 Unauthorized.
//
// DOES:
//   ✅ Verify JWT token from Authorization header
//   ✅ Attach decoded user to req.user
//   ✅ Pass to next middleware if authenticated
//
// DOES NOT:
//   ❌ Check ownership (e.g., "is this YOUR video?")
//   ❌ Check permissions (e.g., "can you delete?")
//   ❌ Make database queries
//   ❌ Handle business logic
//
// HOW IT WORKS:
//   1. Extract the token from "Authorization: Bearer <token>"
//   2. Verify it using Supabase's JWT secret
//   3. Decode the user ID and email
//   4. Attach to req.user for downstream handlers
//
// USAGE IN app.ts:
//   ```ts
//   import { authMiddleware } from "./middleware/auth.middleware.js";
//   app.use("/api", authMiddleware);  // Protect all /api routes
//   ```
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

// ── authMiddleware ──────────────────────────────────────
// Express middleware that validates JWT tokens.
//
// Checks the "Authorization" header for a Bearer token,
// verifies it with Supabase Auth, and attaches the user
// to the request object.
//
// If no token or invalid token → responds with 401.
// If valid → calls next() so the request continues.
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // ── Step 1: Extract the token ─────────────────────
    // Expected header format: "Authorization: Bearer eyJhbGciOi..."
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided — reject immediately
      logger.warn("Auth failed: missing or malformed Authorization header", {
        path: req.path,
      });
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing or malformed Authorization header",
        status: 401,
      });
      return;
    }

    // Extract just the token part (after "Bearer ")
    const token = authHeader.split(" ")[1];

    // ── Step 2: Verify with Supabase ──────────────────
    // supabase.auth.getUser() verifies the JWT and returns
    // the user if valid. This is the recommended approach
    // for Supabase projects (avoids manual JWT verification).
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      logger.warn("Auth failed: invalid token", {
        path: req.path,
        error: error?.message,
      });
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
        status: 401,
      });
      return;
    }

    // ── Step 3: Attach user to request ────────────────
    // Now every downstream handler can access req.user
    req.user = {
      id: data.user.id,
      email: data.user.email ?? "",
    };

    logger.debug("Auth successful", {
      userId: data.user.id,
      path: req.path,
    });

    // ── Step 4: Continue to next middleware/route ──────
    next();
  } catch (error) {
    // Unexpected error (network issue, Supabase down, etc.)
    logger.error("Auth middleware unexpected error", { error });
    res.status(500).json({
      error: "InternalServerError",
      message: "Authentication service unavailable",
      status: 500,
    });
  }
}
