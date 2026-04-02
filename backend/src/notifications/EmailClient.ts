// ═══════════════════════════════════════════════════════════
// 📁 /notifications/EmailClient.ts — Email Notification Client (Resend)
// ═══════════════════════════════════════════════════════════

import { Resend } from "resend";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { env } from "../utils/env.js";
import { load, fill } from "../lib/fs-ops.js";
import { TEMPLATES_MAP } from "../lib/template-path-map.js";
import type {
  EmailNotificationData,
  EmailTemplate,
  EmailTemplateData,
  UserNotificationPreferences,
} from "./types.js";
import type { Platforms } from "../types/index.js";

interface BatchedEmail {
  userId: string;
  email: string;
  jobs: Array<{
    jobId: string;
    platform: Platforms;
    generationId?: string;
    timestamp: string;
  }>;
  scheduledAt: Date;
}


export class EmailClient {
  private resend: Resend | null = null;
  private batchedEmails: Map<string, BatchedEmail> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly FROM = env.EMAIL_FROM;

  initialize(): void {
    if (!env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not set — email notifications disabled");
      return;
    }

    this.resend = new Resend(env.RESEND_API_KEY);

    // Process batched emails every minute
    this.batchInterval = setInterval(() => {
      this.processBatchedEmails();
    }, 60_000);

    logger.info("Email client initialized (Resend)");
  }

  // ── Public API ───────────────────────────────────────────

  async sendJobCompletionEmail(
    userId: string,
    jobId: string,
    platform: Platforms,
    generationId?: string,
  ): Promise<void> {
    try {
      const { email, preferences } = await this.getUserEmailAndPreferences(userId);
      if (!email || !preferences.emailEnabled) return;

      if (preferences.batchNotifications) {
        await this.addToBatch(userId, email, jobId, platform, generationId);
        return;
      }

      const contentUrl = this.getContentUrl(generationId);
      const template = this.getJobCompletedTemplate({ platform, contentUrl, timestamp: new Date().toISOString(), jobId });
      await this.send({ to: email, subject: template.subject, body: template.body, jobId, platform, contentUrl });
    } catch (error) {
      logger.error("Error sending job completion email", { error, userId });
    }
  }

  async sendJobFailureEmail(
    userId: string,
    jobId: string,
    platform: Platforms | undefined,
    errorMessage: string,
  ): Promise<void> {
    try {
      const { email, preferences } = await this.getUserEmailAndPreferences(userId);
      if (!email || !preferences.emailEnabled) return;

      const template = this.getJobFailedTemplate({ platform, errorMessage, timestamp: new Date().toISOString(), jobId });
      await this.send({ to: email, subject: template.subject, body: template.body, jobId, platform });
    } catch (error) {
      logger.error("Error sending job failure email", { error, userId });
    }
  }

  async shutdown(): Promise<void> {
    if (this.batchInterval) clearInterval(this.batchInterval);

    for (const batch of this.batchedEmails.values()) {
      try { await this.sendBatchedEmail(batch); } catch { /* best-effort */ }
    }

    this.batchedEmails.clear();
    logger.info("Email client shut down");
  }

  // ── Internal send ────────────────────────────────────────

  private async send(data: EmailNotificationData): Promise<void> {
    if (!this.resend) {
      logger.warn("Email not sent — Resend client not initialized", { to: data.to });
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.FROM,
        to: data.to,
        subject: data.subject,
        html: data.body,
      });

      if (error) {
        logger.error("Resend API error", { error, to: data.to, jobId: data.jobId });
        return;
      }

      logger.info("Email sent via Resend", { to: data.to, subject: data.subject, jobId: data.jobId });
    } catch (error) {
      logger.error("Failed to send email via Resend", { error, to: data.to });
    }
  }

  // ── Batching ─────────────────────────────────────────────

  private async addToBatch(
    userId: string,
    email: string,
    jobId: string,
    platform: Platforms,
    generationId?: string,
  ): Promise<void> {
    const existing = this.batchedEmails.get(userId);

    if (existing) {
      existing.jobs.push({ jobId, platform, generationId, timestamp: new Date().toISOString() });
    } else {
      this.batchedEmails.set(userId, {
        userId,
        email,
        jobs: [{ jobId, platform, generationId, timestamp: new Date().toISOString() }],
        scheduledAt: new Date(Date.now() + this.BATCH_WINDOW_MS),
      });
    }
  }

  private async processBatchedEmails(): Promise<void> {
    const now = new Date();
    for (const [userId, batch] of this.batchedEmails.entries()) {
      if (batch.scheduledAt <= now) {
        try {
          await this.sendBatchedEmail(batch);
          this.batchedEmails.delete(userId);
        } catch (error) {
          logger.error("Error sending batched email", { error, userId });
        }
      }
    }
  }

  private async sendBatchedEmail(batch: BatchedEmail): Promise<void> {
    const template = this.getBatchCompletedTemplate(batch);
    await this.send({ to: batch.email, subject: template.subject, body: template.body, jobId: batch.jobs[0].jobId });
    logger.info("Sent batched email", { userId: batch.userId, jobCount: batch.jobs.length });
  }

  // ── User data ────────────────────────────────────────────

  private async getUserEmailAndPreferences(userId: string): Promise<{
    email: string | null;
    preferences: UserNotificationPreferences;
  }> {
    try {
      const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
      if (error || !userData.user) {
        logger.error("Error fetching user for email", { error, userId });
        return { email: null, preferences: this.defaultPreferences(userId) };
      }
      return { email: userData.user.email ?? null, preferences: this.defaultPreferences(userId) };
    } catch (error) {
      logger.error("Error getting user email", { error, userId });
      return { email: null, preferences: this.defaultPreferences(userId) };
    }
  }

  private defaultPreferences(userId: string): UserNotificationPreferences {
    return { userId, emailEnabled: true, webSocketEnabled: true, batchNotifications: true, batchWindowMinutes: 5 };
  }

  // ── Helpers ──────────────────────────────────────────────

  private getContentUrl(generationId?: string): string {
    return generationId
      ? `https://app.creatorjot.com/generations/${generationId}`
      : "https://app.creatorjot.com/generations";
  }

  private platformName(platform?: string): string {
    const names: Record<string, string> = {
      x: "Twitter/X", linkedin: "LinkedIn", blog: "Blog",
      yt_community_post: "YouTube Community", facebook: "Facebook", tumblr: "Tumblr", email: "Email",
    };
    return platform ? (names[platform] ?? platform) : "content";
  }

  // ── Templates ────────────────────────────────────────────

  private getJobCompletedTemplate(data: EmailTemplateData): EmailTemplate {
    const name = this.platformName(data.platform)
    const html = fill(load(TEMPLATES_MAP.EMAIL_GEN_COMPLETE), {
      name: 'there',
      platform: name,
      content_url: data.contentUrl ?? 'https://creatorjot.com/dashboard',
      video_title: '',
    })
    return {
      subject: `Your ${name} post is ready ✓`,
      body: html,
    }
  }

  private getJobFailedTemplate(data: EmailTemplateData): EmailTemplate {
    const name = this.platformName(data.platform);
    return {
      subject: "Content generation failed",
      body: `<html><body style="font-family:Arial,sans-serif;color:#333;line-height:1.6">
        <div style="max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#f44336">Content Generation Failed</h2>
          <p>We encountered an issue generating your ${name} content.</p>
          <div style="background:#fff3cd;padding:15px;border-radius:5px;border-left:4px solid #ffc107;margin:20px 0">
            <strong>Error:</strong> ${data.errorMessage}
          </div>
          <p><strong>Job ID:</strong> ${data.jobId} &nbsp;|&nbsp; <strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
          <p>Please try again or contact <a href="mailto:support@creatorjot.com">support@creatorjot.com</a></p>
          <p style="color:#666;font-size:14px">The CreatorJot Team</p>
        </div></body></html>`,
    };
  }

  private getBatchCompletedTemplate(batch: BatchedEmail): EmailTemplate {
    const items = batch.jobs
      .map((j) => `<li><strong>${this.platformName(j.platform)}</strong> — <a href="${this.getContentUrl(j.generationId)}">View</a></li>`)
      .join("");
    return {
      subject: `${batch.jobs.length} pieces of content are ready 🎉`,
      body: `<html><body style="font-family:Arial,sans-serif;color:#333;line-height:1.6">
        <div style="max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#4CAF50">${batch.jobs.length} pieces of content ready 🎉</h2>
          <ul style="list-style:none;padding:0">${items}</ul>
          <a href="https://app.creatorjot.com/generations" style="display:inline-block;background:#4CAF50;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;margin:20px 0">View All</a>
          <p style="color:#666;font-size:14px">The CreatorJot Team</p>
        </div></body></html>`,
    };
  }
}
