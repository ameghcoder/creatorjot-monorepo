// ═══════════════════════════════════════════════════════════
// 📁 /queue/index.ts — Queue System Exports
// ═══════════════════════════════════════════════════════════

// Core components
export { QueueManager, queueManager, QUEUE_NAMES } from "./QueueManager.js";
export { JobManagementService, jobManagementService } from "./JobManagementService.js";

// Utilities
export { calculatePriority, getBasePriority, calculateAgeFactor } from "./utils/priority.js";
export { DuplicateChecker, duplicateChecker } from "./utils/DuplicateChecker.js";

// Types
export type {
  JobStatus,
  JobType,
  JobEventType,
  UserTier,
  BaseJob,
  TranscriptQueueJob,
  GenerationQueueJob,
  JobLog,
  ErrorDetails,
  TranscriptRecord,
  GenerationRecord,
  PgBossConfig,
  PublishOptions,
  JobHandler,
  QueueMetrics,
  QueueStats,
  JobResult,
  BatchJobResult,
  JobStatusResponse,
  TranscriptJobParams,
  GenerationJobParams,
  BatchGenerationParams,
} from "./types.js";
