// ═══════════════════════════════════════════════════════════
// 📁 /notifications/index.ts — Notification System Exports
// ═══════════════════════════════════════════════════════════

export { WebSocketServer } from "./WebSocketServer.js";
export { SSEServer } from "./SSEServer.js";
export { EmailClient } from "./EmailClient.js";
export { NotificationService } from "./NotificationService.js";

export type {
  NotificationType,
  JobNotification,
  NotificationData,
  BatchNotification,
  ConnectionInfo,
  MissedNotification,
  EmailNotificationData,
  EmailTemplate,
  EmailTemplateData,
  UserNotificationPreferences,
} from "./types.js";
