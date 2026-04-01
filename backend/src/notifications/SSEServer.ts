// ═══════════════════════════════════════════════════════════
// 📁 /notifications/SSEServer.ts — Server-Sent Events Server
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Provides Server-Sent Events (SSE) as a fallback for environments
//   where WebSocket connections are blocked (corporate firewalls, etc.).
//
// FEATURES:
//   ✅ SSE endpoint for real-time notifications
//   ✅ JWT authentication
//   ✅ Same notification delivery as WebSocket
//   ✅ Automatic reconnection support
//   ✅ Heartbeat to keep connection alive
//
// REQUIREMENTS:
//   - 30.7: Support SSE as fallback for blocked WebSocket environments
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type { NotificationData } from "./types.js";

interface SSEConnection {
  userId: string;
  response: Response;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export class SSEServer {
  private connections: Map<string, Set<SSEConnection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize SSE server with heartbeat
   */
  initialize(): void {
    // Send heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    logger.info("SSE server initialized");
  }

  /**
   * Handle SSE connection request
   * @param req Express request
   * @param res Express response
   */
  async handleConnection(req: Request, res: Response): Promise<void> {
    try {
      // Extract token from query or header
      const token =
        req.query.token?.toString() ||
        req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Authentication token required",
        });
        return;
      }

      // Authenticate
      const userId = await this.authenticateConnection(token);
      if (!userId) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or expired token",
        });
        return;
      }

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

      // Track connection
      const connection: SSEConnection = {
        userId,
        response: res,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
      };

      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId)!.add(connection);

      logger.info("SSE connection established", { userId });

      // Send initial connection message
      this.sendEvent(res, {
        type: "connected",
        userId,
        timestamp: new Date().toISOString(),
      });

      // Handle client disconnect
      req.on("close", () => {
        this.handleDisconnection(connection);
      });
    } catch (error) {
      logger.error("Error handling SSE connection", { error });
      res.status(500).json({
        error: "InternalServerError",
        message: "Failed to establish SSE connection",
      });
    }
  }

  /**
   * Authenticate SSE connection using JWT token
   * @param token JWT token
   * @returns User ID if valid, null otherwise
   */
  private async authenticateConnection(token: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        logger.warn("SSE auth failed", { error: error?.message });
        return null;
      }

      return data.user.id;
    } catch (error) {
      logger.error("Error authenticating SSE connection", { error });
      return null;
    }
  }

  /**
   * Handle SSE disconnection
   * @param connection SSE connection
   */
  private handleDisconnection(connection: SSEConnection): void {
    const userConnections = this.connections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connection);
      if (userConnections.size === 0) {
        this.connections.delete(connection.userId);
      }
    }

    logger.info("SSE connection closed", { userId: connection.userId });
  }

  /**
   * Send event to SSE client
   * @param res Response object
   * @param data Event data
   */
  private sendEvent(res: Response, data: any): void {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error("Error sending SSE event", { error });
    }
  }

  /**
   * Broadcast notification to user via SSE
   * @param userId User ID
   * @param notification Notification data
   * @returns True if sent, false if user not connected
   */
  async broadcast(
    userId: string,
    notification: NotificationData,
  ): Promise<boolean> {
    const userConnections = this.connections.get(userId);

    if (!userConnections || userConnections.size === 0) {
      logger.debug("User not connected via SSE", { userId });
      return false;
    }

    // Send to all user SSE connections
    let sent = false;
    for (const connection of userConnections) {
      try {
        this.sendEvent(connection.response, notification);
        sent = true;
      } catch (error) {
        logger.error("Error sending SSE notification", { userId, error });
        // Remove failed connection
        this.handleDisconnection(connection);
      }
    }

    if (sent) {
      logger.debug("Notification sent via SSE", {
        userId,
        type: notification.type,
      });
    }

    return sent;
  }

  /**
   * Send heartbeat to all connections
   */
  private sendHeartbeat(): void {
    const now = new Date();
    let sent = 0;

    for (const [userId, connections] of this.connections.entries()) {
      for (const connection of connections) {
        try {
          this.sendEvent(connection.response, {
            type: "heartbeat",
            timestamp: now.toISOString(),
          });
          connection.lastHeartbeat = now;
          sent++;
        } catch (error) {
          logger.error("Error sending SSE heartbeat", { userId, error });
          this.handleDisconnection(connection);
        }
      }
    }

    if (sent > 0) {
      logger.debug("SSE heartbeat sent", { connections: sent });
    }
  }

  /**
   * Check if user is connected via SSE
   * @param userId User ID
   * @returns True if user has active SSE connections
   */
  isUserConnected(userId: string): boolean {
    const userConnections = this.connections.get(userId);
    return userConnections !== undefined && userConnections.size > 0;
  }

  /**
   * Get number of active SSE connections for a user
   * @param userId User ID
   * @returns Number of active connections
   */
  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalConnections: Array.from(this.connections.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      ),
      uniqueUsers: this.connections.size,
    };
  }

  /**
   * Shutdown SSE server
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const [userId, connections] of this.connections.entries()) {
      for (const connection of connections) {
        try {
          this.sendEvent(connection.response, {
            type: "shutdown",
            message: "Server shutting down",
          });
          connection.response.end();
        } catch (error) {
          logger.error("Error closing SSE connection", { userId, error });
        }
      }
    }

    this.connections.clear();
    logger.info("SSE server shut down");
  }
}
