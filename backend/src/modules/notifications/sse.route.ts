// ═══════════════════════════════════════════════════════════
// 📁 /modules/notifications/sse.route.ts — SSE Notification Route
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Exposes GET /api/v1/notifications/sse for the frontend to subscribe
//   to real-time job status updates.
//
//   Since the worker runs in a separate process, we bridge the gap using
//   Supabase Realtime: the API server subscribes to generation_queue row
//   updates and pushes them to connected SSE clients.
//
// USAGE (frontend):
//   const es = new EventSource('/api/notifications/sse?token=<jwt>')
//   es.onmessage = (e) => { const data = JSON.parse(e.data); ... }
// ═══════════════════════════════════════════════════════════

import { Router } from "express";
import type { Request, Response } from "express";
import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// ── In-process SSE connection registry ──────────────────
interface SSEClient {
  userId: string;
  res: Response;
}

const clients = new Map<string, Set<SSEClient>>();

function addClient(userId: string, client: SSEClient) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(client);
}

function removeClient(userId: string, client: SSEClient) {
  clients.get(userId)?.delete(client);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

function sendToUser(userId: string, data: object) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of userClients) {
    try {
      client.res.write(payload);
    } catch (err: any) {
      // ECONNRESET or similar — client is gone, clean up silently
      if (err?.code !== 'ECONNRESET') {
        logger.warn("SSE write error", { userId, code: err?.code });
      }
      removeClient(userId, client);
    }
  }
}

// ── Supabase Realtime subscription (shared, started once) ──
let realtimeStarted = false;

function startRealtimeSubscription() {
  if (realtimeStarted) return;
  realtimeStarted = true;

  // Use the shared supabase admin client for Realtime subscription
  supabase
    .channel("generation_queue_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "generation_queue" },
      (payload) => {
        const row = payload.new as {
          id: string;
          user_id: string;
          status: string;
          session_id: string;
          generation_id?: string;
          error_message?: string;
          metadata?: { progress?: number; currentStep?: string };
        };

        if (!row?.user_id) return;

        // Only push terminal or progress updates
        const interestingStatuses = ["completed", "failed", "cancelled", "processing"];
        if (!interestingStatuses.includes(row.status)) return;

        sendToUser(row.user_id, {
          type: row.status === "completed" ? "job_completed" : row.status === "failed" ? "job_failed" : "job_progress",
          jobId: row.id,
          sessionId: row.session_id,
          status: row.status,
          generationId: row.generation_id ?? undefined,
          errorMessage: row.error_message ?? undefined,
          progress: row.metadata?.progress,
          currentStep: row.metadata?.currentStep,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe((status) => {
      logger.info("Supabase Realtime subscription status", { status });
    });
}

// ── SSE endpoint ─────────────────────────────────────────
// GET /api/v1/notifications/sse
// Auth is already applied by authMiddleware in app.ts
router.get("/sse", (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Start Realtime subscription on first connection
  startRealtimeSubscription();

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const client: SSEClient = { userId, res };
  addClient(userId, client);

  logger.info("SSE client connected", { userId });

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: "connected", userId, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      removeClient(userId, client);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(userId, client);
    logger.info("SSE client disconnected", { userId });
  });

  // Handle socket errors (e.g. ECONNRESET when proxy drops the connection)
  res.socket?.on("error", () => {
    clearInterval(heartbeat);
    removeClient(userId, client);
  });
});

export { sendToUser };
export const sseNotificationRouter = router;
export default router;
