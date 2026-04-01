// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/CostTracker.ts — AI Service Cost Tracking
// ═══════════════════════════════════════════════════════════

import { logger } from "../../lib/logger.js";
import { supabase } from "../../lib/supabase.js";

/**
 * AI service provider types
 */
export type AIProvider = "gemini" | "claude";

/**
 * Cost tracking record
 */
export interface CostRecord {
  provider: AIProvider;
  jobId: string | null;
  jobType: "transcript" | "generation";
  tokenUsage: number;
  estimatedCost: number;
  timestamp: Date;
}

/**
 * Daily cost aggregation
 */
export interface DailyCostSummary {
  date: string;
  provider: AIProvider;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

/**
 * Cost metrics for monitoring
 */
export interface CostMetrics {
  today: {
    gemini: { tokens: number; cost: number; requests: number };
    claude: { tokens: number; cost: number; requests: number };
    total: { tokens: number; cost: number; requests: number };
  };
  thisMonth: {
    gemini: { tokens: number; cost: number; requests: number };
    claude: { tokens: number; cost: number; requests: number };
    total: { tokens: number; cost: number; requests: number };
  };
}

/**
 * CostTracker tracks AI service usage and costs.
 * 
 * Responsibilities:
 * - Track token usage per request
 * - Calculate estimated cost per job
 * - Aggregate daily costs by service provider
 * - Expose cost metrics via monitoring endpoint
 * - Store cost data for analysis and billing
 * 
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.6
 */
export class CostTracker {
  // In-memory cache for today's costs (reset daily)
  private todayCosts: Map<AIProvider, { tokens: number; cost: number; requests: number }> =
    new Map();
  private lastResetDate: string = "";

  constructor() {
    this.initializeCache();
  }

  /**
   * Track a single AI service request
   * 
   * Requirements: 34.1, 34.2
   */
  async trackRequest(record: CostRecord): Promise<void> {
    try {
      // Update in-memory cache
      this.updateCache(record);

      // Log the cost tracking
      logger.info("AI service cost tracked", {
        provider: record.provider,
        jobId: record.jobId,
        jobType: record.jobType,
        tokenUsage: record.tokenUsage,
        estimatedCost: `$${record.estimatedCost.toFixed(6)}`,
      });

      // Store in database for historical analysis
      await this.storeCostRecord(record);
    } catch (error) {
      logger.error("Failed to track AI service cost", {
        error: error instanceof Error ? error.message : String(error),
        record,
      });
      // Don't throw - cost tracking failure shouldn't break job processing
    }
  }

  /**
   * Get current cost metrics
   * 
   * Requirements: 34.4, 34.6
   */
  async getCostMetrics(): Promise<CostMetrics> {
    // Ensure cache is up to date
    this.checkAndResetCache();

    // Get today's costs from cache
    const todayGemini = this.todayCosts.get("gemini") || {
      tokens: 0,
      cost: 0,
      requests: 0,
    };
    const todayClaude = this.todayCosts.get("claude") || {
      tokens: 0,
      cost: 0,
      requests: 0,
    };

    // Get this month's costs from database
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthCosts = await this.getAggregatedCosts(monthStart);

    return {
      today: {
        gemini: todayGemini,
        claude: todayClaude,
        total: {
          tokens: todayGemini.tokens + todayClaude.tokens,
          cost: todayGemini.cost + todayClaude.cost,
          requests: todayGemini.requests + todayClaude.requests,
        },
      },
      thisMonth: monthCosts,
    };
  }

  /**
   * Get daily cost summary for a date range
   * 
   * Requirements: 34.3
   */
  async getDailyCosts(
    startDate: Date,
    endDate: Date
  ): Promise<DailyCostSummary[]> {
    try {
      const { data, error } = await supabase
        .from("ai_cost_tracking")
        .select("*")
        .gte("timestamp", startDate.toISOString())
        .lte("timestamp", endDate.toISOString())
        .order("timestamp", { ascending: true });

      if (error) {
        throw error;
      }

      // Aggregate by date and provider
      const aggregated = new Map<string, DailyCostSummary>();

      for (const record of data || []) {
        const date = new Date(record.timestamp).toISOString().split("T")[0];
        const key = `${date}-${record.provider}`;

        if (!aggregated.has(key)) {
          aggregated.set(key, {
            date,
            provider: record.provider,
            totalTokens: 0,
            totalCost: 0,
            requestCount: 0,
          });
        }

        const summary = aggregated.get(key)!;
        summary.totalTokens += record.token_usage;
        summary.totalCost += record.estimated_cost;
        summary.requestCount += 1;
      }

      return Array.from(aggregated.values());
    } catch (error) {
      logger.error("Failed to get daily costs", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Initialize in-memory cache
   */
  private initializeCache(): void {
    const today = new Date().toISOString().split("T")[0];
    this.lastResetDate = today;

    this.todayCosts.set("gemini", { tokens: 0, cost: 0, requests: 0 });
    this.todayCosts.set("claude", { tokens: 0, cost: 0, requests: 0 });
  }

  /**
   * Check if cache needs to be reset (new day)
   */
  private checkAndResetCache(): void {
    const today = new Date().toISOString().split("T")[0];

    if (today !== this.lastResetDate) {
      logger.info("Resetting daily cost cache", {
        previousDate: this.lastResetDate,
        newDate: today,
      });
      this.initializeCache();
    }
  }

  /**
   * Update in-memory cache
   */
  private updateCache(record: CostRecord): void {
    this.checkAndResetCache();

    const current = this.todayCosts.get(record.provider) || {
      tokens: 0,
      cost: 0,
      requests: 0,
    };

    current.tokens += record.tokenUsage;
    current.cost += record.estimatedCost;
    current.requests += 1;

    this.todayCosts.set(record.provider, current);
  }

  /**
   * Store cost record in database
   */
  private async storeCostRecord(record: CostRecord): Promise<void> {
    const { error } = await supabase.from("ai_cost_tracking").insert({
      provider: record.provider,
      job_id: record.jobId,
      job_type: record.jobType,
      token_usage: record.tokenUsage,
      estimated_cost: record.estimatedCost,
      timestamp: record.timestamp.toISOString(),
    });

    if (error) {
      logger.error("Failed to store cost record", {
        error: error.message,
        record,
      });
    }
  }

  /**
   * Get aggregated costs from database
   */
  private async getAggregatedCosts(
    startDate: Date
  ): Promise<CostMetrics["thisMonth"]> {
    try {
      const { data, error } = await supabase
        .from("ai_cost_tracking")
        .select("provider, token_usage, estimated_cost")
        .gte("timestamp", startDate.toISOString());

      if (error) {
        throw error;
      }

      const gemini = { tokens: 0, cost: 0, requests: 0 };
      const claude = { tokens: 0, cost: 0, requests: 0 };

      for (const record of data || []) {
        if (record.provider === "gemini") {
          gemini.tokens += record.token_usage;
          gemini.cost += record.estimated_cost;
          gemini.requests += 1;
        } else if (record.provider === "claude") {
          claude.tokens += record.token_usage;
          claude.cost += record.estimated_cost;
          claude.requests += 1;
        }
      }

      return {
        gemini,
        claude,
        total: {
          tokens: gemini.tokens + claude.tokens,
          cost: gemini.cost + claude.cost,
          requests: gemini.requests + claude.requests,
        },
      };
    } catch (error) {
      logger.error("Failed to get aggregated costs", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        gemini: { tokens: 0, cost: 0, requests: 0 },
        claude: { tokens: 0, cost: 0, requests: 0 },
        total: { tokens: 0, cost: 0, requests: 0 },
      };
    }
  }
}

// Export singleton instance
export const costTracker = new CostTracker();
