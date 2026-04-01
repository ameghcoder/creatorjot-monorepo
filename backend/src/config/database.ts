// ═══════════════════════════════════════════════════════════
// 📁 /config/database.ts — Database Connection Pooling
// ═══════════════════════════════════════════════════════════

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { config } from "./index.js";
import { logger } from "../lib/logger.js";

/**
 * Database pool manager
 * Requirements: 31.4
 */
export class DatabasePool {
  private pool: Pool | null = null;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the database connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn("DatabasePool already initialized");
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: config.database.connectionString,
        min: config.database.pool.min,
        max: config.database.pool.max,
        idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
        connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
        
        // Additional pool configuration
        allowExitOnIdle: false,
        
        // Error handling
        log: (msg) => logger.debug("pg-pool", { message: msg }),
      });

      // Set up event handlers
      this.pool.on("connect", (client) => {
        logger.debug("New database client connected", {
          totalCount: this.pool?.totalCount,
          idleCount: this.pool?.idleCount,
          waitingCount: this.pool?.waitingCount,
        });
      });

      this.pool.on("acquire", (client) => {
        logger.debug("Database client acquired from pool", {
          totalCount: this.pool?.totalCount,
          idleCount: this.pool?.idleCount,
          waitingCount: this.pool?.waitingCount,
        });
      });

      this.pool.on("remove", (client) => {
        logger.debug("Database client removed from pool", {
          totalCount: this.pool?.totalCount,
          idleCount: this.pool?.idleCount,
          waitingCount: this.pool?.waitingCount,
        });
      });

      this.pool.on("error", (err, client) => {
        logger.error("Unexpected database pool error", {
          error: err.message,
          stack: err.stack,
        });
      });

      // Test connection
      await this.testConnection();

      this.isInitialized = true;

      // Start health checks
      this.startHealthChecks();

      logger.info("DatabasePool initialized successfully", {
        min: config.database.pool.min,
        max: config.database.pool.max,
        idleTimeout: config.database.pool.idleTimeoutMillis,
        connectionTimeout: config.database.pool.connectionTimeoutMillis,
      });
    } catch (error) {
      logger.error("Failed to initialize DatabasePool", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error("Pool not initialized");
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query("SELECT NOW()");
      client.release();

      logger.info("Database connection test successful", {
        serverTime: result.rows[0].now,
      });
    } catch (error) {
      logger.error("Database connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      30000
    );
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

      logger.debug("Database health check passed", {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      });
    } catch (error) {
      logger.error("Database health check failed", {
        error: error instanceof Error ? error.message : String(error),
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      });
    }
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    this.ensureInitialized();

    try {
      const result = await this.pool!.query<T>(text, params);
      return result;
    } catch (error) {
      logger.error("Database query failed", {
        error: error instanceof Error ? error.message : String(error),
        query: text.substring(0, 100), // Log first 100 chars
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    this.ensureInitialized();

    try {
      const client = await this.pool!.connect();
      return client;
    } catch (error) {
      logger.error("Failed to get database client", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Transaction failed and rolled back", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Check if pool is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.pool || !this.isInitialized) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      return true;
    } catch (error) {
      logger.error("Database health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Gracefully close the pool
   */
  async close(): Promise<void> {
    if (!this.isInitialized || !this.pool) {
      return;
    }

    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Close pool
      await this.pool.end();
      this.isInitialized = false;

      logger.info("DatabasePool closed successfully");
    } catch (error) {
      logger.error("Failed to close DatabasePool", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Ensure the pool is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.pool) {
      throw new Error("DatabasePool not initialized. Call initialize() first.");
    }
  }
}

// Export singleton instance
export const databasePool = new DatabasePool();
