// ═══════════════════════════════════════════════════════════
// 📁 /worker/index.ts — Worker Exports (Event-Driven Only)
// ═══════════════════════════════════════════════════════════

// Event-driven workers (pg-boss)
export { TranscriptWorker } from "./TranscriptWorker.js";
export { GenerationWorker } from "./GenerationWorker.js";

// Error handling
export { ErrorHandler, HTTPError, QuotaExceededError, TranscriptNotAvailableError } from "./ErrorHandler.js";
export type { ErrorClassification, ErrorType } from "./ErrorHandler.js";

// Note: Legacy polling-based workers and StuckJobDetector moved to /archive/adv/worker/
