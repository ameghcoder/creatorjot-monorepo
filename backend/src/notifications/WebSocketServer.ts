// ═══════════════════════════════════════════════════════════
// 📁 /notifications/WebSocketServer.ts — WebSocket Server
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Manages WebSocket connections for real-time job notifications.
//   Handles authentication, connection tracking, and message broadcasting.
//
// FEATURES:
//   ✅ JWT authentication for WebSocket connections
//   ✅ Track active connections per user
//   ✅ Send missed notifications on reconnection (last 10 minutes)
//   ✅ Broadcast notifications to connected users
//   ✅ Automatic cleanup of stale connections
//
// REQUIREMENTS:
//   - 9.1: Real-time updates via WebSocket
//   - 9.3: Include job_id, status, platform in notifications
//   - 30.1: Establish WebSocket connection
//   - 30.2: Send updates within 1 second
//   - 30.3: Include job_id, status, progress, platform
//   - 30.4: Reconnection with exponential backoff
//   - 30.5: Send missed notifications (last 10 minutes)
//   - 30.6: Authenticate WebSocket connections
// ═══════════════════════════════════════════════════════════

import { WebSocketServer as WSServer, WebSocket } from "ws";
import type { Server } from "http";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type {
  NotificationData,
  ConnectionInfo,
  MissedNotification,
} from "./types.js";

export class WebSocketServer {
  private wss: WSServer | null = null;
  private connections: Map<string, Set<WebSocket>> = new Map();
  private connectionInfo: Map<WebSocket, ConnectionInfo> = new Map();
  private missedNotifications: MissedNotification[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the WebSocket server
   * @param server HTTP server instance to attach WebSocket server to
   */
  async initialize(server: Server): Promise<void> {
    this.wss = new WSServer({ server, path: "/ws" });

    this.wss.on("connection", async (ws, req) => {
      try {
        // Extract token from query string or headers
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token =
          url.searchParams.get("token") ||
          req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          logger.warn("WebSocket connection rejected: no token provided");
          ws.close(1008, "Authentication required");
          return;
        }

        // Authenticate the connection
        const userId = await this.authenticateConnection(token);
        if (!userId) {
          logger.warn("WebSocket connection rejected: invalid token");
          ws.close(1008, "Invalid token");
          return;
        }

        // Handle the authenticated connection
        await this.handleConnection(ws, userId);
      } catch (error) {
        logger.error("Error handling WebSocket connection", { error });
        ws.close(1011, "Internal server error");
      }
    });

    // Start cleanup interval for stale connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Every minute

    logger.info("WebSocket server initialized", { path: "/ws" });
  }

  /**
   * Authenticate WebSocket connection using JWT token
   * @param token JWT token from client
   * @returns User ID if valid, null otherwise
   */
  private async authenticateConnection(token: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        logger.warn("WebSocket auth failed", { error: error?.message });
        return null;
      }

      return data.user.id;
    } catch (error) {
      logger.error("Error authenticating WebSocket connection", { error });
      return null;
    }
  }

  /**
   * Handle new WebSocket connection
   * @param ws WebSocket instance
   * @param userId Authenticated user ID
   */
  async handleConnection(ws: WebSocket, userId: string): Promise<void> {
    // Track connection
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(ws);

    // Store connection info
    this.connectionInfo.set(ws, {
      userId,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    logger.info("WebSocket connection established", { userId });

    // Send missed notifications from last 10 minutes
    await this.sendMissedNotifications(userId, ws);

    // Handle incoming messages (for heartbeat/ping)
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          // Update last activity
          const info = this.connectionInfo.get(ws);
          if (info) {
            info.lastActivity = new Date();
          }
        }
      } catch (error) {
        logger.warn("Invalid WebSocket message", { error });
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      this.handleDisconnection(ws, userId);
    });

    // Handle errors
    ws.on("error", (error) => {
      logger.error("WebSocket error", { userId, error });
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connected",
        userId,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Handle WebSocket disconnection
   * @param ws WebSocket instance
   * @param userId User ID
   */
  private handleDisconnection(ws: WebSocket, userId: string): void {
    // Remove from connections
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }

    // Remove connection info
    this.connectionInfo.delete(ws);

    logger.info("WebSocket connection closed", { userId });
  }

  /**
   * Send missed notifications from last 10 minutes
   * @param userId User ID
   * @param ws WebSocket instance
   */
  private async sendMissedNotifications(
    userId: string,
    ws: WebSocket,
  ): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const missed = this.missedNotifications.filter(
      (n) => n.userId === userId && n.createdAt >= tenMinutesAgo,
    );

    if (missed.length > 0) {
      logger.info("Sending missed notifications", {
        userId,
        count: missed.length,
      });

      for (const notification of missed) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              ...notification.notification,
              missed: true,
            }),
          );
        }
      }

      // Remove sent notifications
      this.missedNotifications = this.missedNotifications.filter(
        (n) => !missed.includes(n),
      );
    }
  }

  /**
   * Broadcast notification to user
   * @param userId User ID to send notification to
   * @param notification Notification data
   * @returns True if sent via WebSocket, false if user offline
   */
  async broadcast(
    userId: string,
    notification: NotificationData,
  ): Promise<boolean> {
    const userConnections = this.connections.get(userId);

    if (!userConnections || userConnections.size === 0) {
      // User is offline, store as missed notification
      this.missedNotifications.push({
        userId,
        notification,
        createdAt: new Date(),
      });

      logger.debug("User offline, notification stored as missed", { userId });
      return false;
    }

    // Send to all user connections
    let sent = false;
    for (const ws of userConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(notification));
          sent = true;
        } catch (error) {
          logger.error("Error sending WebSocket message", { userId, error });
        }
      }
    }

    if (sent) {
      logger.debug("Notification sent via WebSocket", {
        userId,
        type: notification.type,
      });
    }

    return sent;
  }

  /**
   * Check if user is currently connected
   * @param userId User ID
   * @returns True if user has active connections
   */
  isUserConnected(userId: string): boolean {
    const userConnections = this.connections.get(userId);
    return userConnections !== undefined && userConnections.size > 0;
  }

  /**
   * Get number of active connections for a user
   * @param userId User ID
   * @returns Number of active connections
   */
  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }

  /**
   * Cleanup stale connections (no activity for 5 minutes)
   */
  private cleanupStaleConnections(): void {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let cleaned = 0;

    for (const [ws, info] of this.connectionInfo.entries()) {
      if (info.lastActivity < fiveMinutesAgo) {
        logger.debug("Closing stale WebSocket connection", {
          userId: info.userId,
        });
        ws.close(1000, "Connection timeout");
        this.handleDisconnection(ws, info.userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info("Cleaned up stale connections", { count: cleaned });
    }

    // Also cleanup old missed notifications (older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const before = this.missedNotifications.length;
    this.missedNotifications = this.missedNotifications.filter(
      (n) => n.createdAt >= tenMinutesAgo,
    );
    const removed = before - this.missedNotifications.length;

    if (removed > 0) {
      logger.debug("Cleaned up old missed notifications", { count: removed });
    }
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalConnections: this.connectionInfo.size,
      uniqueUsers: this.connections.size,
      missedNotifications: this.missedNotifications.length,
    };
  }

  /**
   * Shutdown the WebSocket server
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const [, connections] of this.connections.entries()) {
      for (const ws of connections) {
        ws.close(1001, "Server shutting down");
      }
    }

    this.connections.clear();
    this.connectionInfo.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info("WebSocket server shut down");
  }
}
