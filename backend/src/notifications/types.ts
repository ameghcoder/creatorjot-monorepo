// ═══════════════════════════════════════════════════════════
// 📁 /notifications/types.ts — Notification System Types
// ═══════════════════════════════════════════════════════════

import type { Platforms } from "../types/index.js";

// ── Notification Types ─────────────────────────────────────

export type NotificationType =
  | "job_completed"
  | "job_failed"
  | "job_cancelled"
  | "batch_completed"
  | "job_progress";

export interface JobNotification {
  userId: string;
  jobId: string;
  sessionId: string;
  status: "completed" | "failed" | "cancelled";
  platform?: Platforms;
  errorMessage?: string;
  generationId?: string;
}

export interface NotificationData {
  type: NotificationType;
  jobId: string;
  sessionId: string;
  status: string;
  platform?: Platforms;
  errorMessage?: string;
  generationId?: string;
  timestamp: string;
  progress?: number;
  currentStep?: string;
}

export interface BatchNotification {
  userId: string;
  sessionId: string;
  jobIds: string[];
  completedCount: number;
  failedCount: number;
  totalCount: number;
}

// ── WebSocket Connection Types ─────────────────────────────

export interface ConnectionInfo {
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface MissedNotification {
  userId: string;
  notification: NotificationData;
  createdAt: Date;
}

// ── Email Notification Types ───────────────────────────────

export interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
  jobId: string;
  platform?: Platforms;
  contentUrl?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailTemplateData {
  platform?: string;
  videoTitle?: string;
  contentUrl?: string;
  errorMessage?: string;
  timestamp: string;
  jobId: string;
}

// ── User Notification Preferences ──────────────────────────

export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  webSocketEnabled: boolean;
  batchNotifications: boolean;
  batchWindowMinutes: number; // Default: 5 minutes
}
