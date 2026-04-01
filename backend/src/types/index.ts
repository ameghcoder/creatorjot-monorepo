// ═══════════════════════════════════════════════════════════
// backend/src/types/index.ts
//
// Re-exports all shared domain types from @creatorjot/shared.
// Backend-specific types (Express extensions) are defined here.
// ═══════════════════════════════════════════════════════════

export * from "@creatorjot/shared";

// ── Authenticated User ─────────────────────────────────────
// Attached to `req.user` by the auth middleware after JWT verification.
export interface User {
  id: string;
  email: string;
}

// ── Rich Transcript Context ────────────────────────────────
// Extracted from transcript chunks during processing.
export interface RichTranscriptContext {
  verbatimQuotes: Array<{ timestamp_start: number; text: string }>;
  dataPoints: Array<{ timestamp_start: number; value: string }>;
  concreteExamples: Array<{ timestamp_start: number; description: string }>;
  extractedAt: string;
}

// ── Express Request Extension ──────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
