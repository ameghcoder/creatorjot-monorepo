// ═══════════════════════════════════════════════════════════
// 📁 /queue/types.ts — Queue System Types
// ═══════════════════════════════════════════════════════════

import type { Platforms, SupportedLang, XPostFormat } from "../types/index.js";

// ── Job Status ─────────────────────────────────────────────
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type JobType = "transcript" | "generation";
export type JobEventType = "queued" | "started" | "completed" | "failed" | "retry" | "cancelled";
export type UserTier = "free" | "paid";

// ── Base Job Interface ─────────────────────────────────────
export interface BaseJob {
  id: string;
  userId: string;
  sessionId: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  processingStartedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
  metadata: Record<string, any>;
}

// ── Transcript Queue Job ───────────────────────────────────
export interface TranscriptQueueJob extends BaseJob {
  ytId: string;
  pendingGenerationJobs?: PendingGenerationJob[];
  generateRichContext?: boolean; // default true — extract rich_context
}

// ── Generation Queue Job ───────────────────────────────────
export interface GenerationQueueJob extends BaseJob {
  transcriptId: string;
  payloadId: string;
  platform: Platforms;
  outputLang: SupportedLang;
  userToneId?: string;       // UUID → fetch tone_prompt from user_tone table
  tonePreset?: string;       // preset key e.g. "viral" | "professional" etc.
  toneCustom?: string;       // raw custom tone string from textarea
  postAngleIndex?: number;   // when set, generate post anchored to this angle
  xPostFormat?: XPostFormat; // x/twitter only — "short" | "long" | "thread"
}

// ── Job Log ────────────────────────────────────────────────
export interface JobLog {
  id: string;
  jobId: string;
  jobType: JobType;
  eventType: JobEventType;
  message: string;
  errorDetails?: ErrorDetails;
  createdAt: Date;
  workerId?: string;
}

// ── Error Details ──────────────────────────────────────────
export interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, any>;
}

// ── Transcript Record ──────────────────────────────────────
export interface TranscriptRecord {
  id?: string;
  ytId: string;
  url: string;
  lang: SupportedLang;
  duration: number;
  summary: string;
  keyPoints: string[];
  summaryGeneratedAt: Date;
  transcriptSource: "api" | "sst";
  createdAt?: Date;
}

// ── Generation Record ──────────────────────────────────────
export interface GenerationRecord {
  id?: string;
  userId: string;
  transcriptId: string;
  sessionId: string;
  platform: Platforms;
  lang: SupportedLang;
  content: string;
  modelUsed: string;
  tokenUsage: number;
  status: JobStatus;
  createdAt?: Date;
}

// ── pg-boss Configuration ──────────────────────────────────
export interface PgBossConfig {
  connectionString: string;
  schema?: string;
  retryLimit: number;
  retryDelay: number;
  retryBackoff: boolean;
  expireInSeconds: number;
  retentionDays: number;
  maintenanceIntervalSeconds: number;
  deleteAfterDays: number;
}

// ── Publish Options ────────────────────────────────────────
export interface PublishOptions {
  priority?: number;
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  expireInSeconds?: number;
  singletonKey?: string;
  startAfter?: Date | number;
}

// ── Job Handler ────────────────────────────────────────────
export type JobHandler<T = any> = (job: { id: string; data: T }) => Promise<void>;

// ── Queue Metrics ──────────────────────────────────────────
export interface QueueMetrics {
  transcriptQueue: QueueStats;
  generationQueue: QueueStats;
  deadLetterQueue: {
    total: number;
  };
  averageProcessingTime: {
    transcript: number;
    generation: number;
  };
  successRate: {
    transcript: number;
    generation: number;
  };
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

// ── Job Result ─────────────────────────────────────────────
export interface JobResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface BatchJobResult {
  success: boolean;
  jobIds?: string[];
  error?: string;
}

// ── Job Status Response ────────────────────────────────────
export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress?: number;
  currentStep?: string;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  generationId?: string;
}

// ── Job Parameters ─────────────────────────────────────────
export interface PendingGenerationJob {
  userId: string;
  transcriptId: string;
  payloadId: string;
  sessionId: string;
  platform: Platforms;
  outputLang: SupportedLang;
  userToneId?: string;
  tonePreset?: string;
  toneCustom?: string;
  userTier: UserTier;
  xPostFormat?: XPostFormat;
  postAngleIndex?: number;
}

export interface TranscriptJobParams {
  userId: string;
  ytId: string;
  sessionId: string;
  userTier: UserTier;
  pendingGenerationJobs?: PendingGenerationJob[];
  generateSummary?: boolean;
  generateRichContext?: boolean;
}

export interface GenerationJobParams {
  userId: string;
  transcriptId: string;
  payloadId: string;
  sessionId: string;
  platform: Platforms;
  outputLang: SupportedLang;
  userToneId?: string;
  tonePreset?: string;
  toneCustom?: string;
  userTier: UserTier;
  postAngleIndex?: number;
  xPostFormat?: XPostFormat;
}

export interface BatchGenerationParams {
  userId: string;
  transcriptId: string;
  payloadId: string;
  sessionId: string;
  jobs: Array<{
    platform: Platforms;
    outputLang: SupportedLang;
    userToneId?: string;
    tonePreset?: string;
    toneCustom?: string;
    xPostFormat?: XPostFormat;
    postAngleIndex?: number;
  }>;
  userTier: UserTier;
}
