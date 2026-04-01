// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/GeminiClient.ts — Gemini AI Client for Summaries and Key Points
// ═══════════════════════════════════════════════════════════

import { logger } from "../../lib/logger.js";
import { env } from "../../utils/env.js";
import { HTTPError } from "../../worker/ErrorHandler.js";
import { costTracker } from "./CostTracker.js";

/**
 * Gemini API response types
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * GeminiClient generates summaries and extracts key points from transcripts.
 *
 * Uses Gemini 2.5 Flash model for cost-effective text processing.
 * Callers build prompts via gemini.prompts.ts and pass them to generateContent.
 *
 * Requirements: 4.7, 4.8, 14.1, 14.2, 14.3, 19.2, 34.1
 */
export class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string = "gemini-2.5-flash";
  private readonly baseUrl: string = "https://generativelanguage.googleapis.com/v1beta";

  // Pricing for Gemini 2.5 Flash
  // Input: $0.30 per 1M tokens, Output: $2.50 per 1M tokens
  private readonly INPUT_COST_PER_TOKEN = 0.30 / 1_000_000;
  private readonly OUTPUT_COST_PER_TOKEN = 2.50 / 1_000_000;

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.GEMINI_API_KEY;

    if (!this.apiKey) {
      throw new Error("Gemini API key is required");
    }
  }

  /**
   * Generate content with a custom prompt (for structured JSON responses).
   * Build the prompt via gemini.prompts.ts before calling this.
   */
  async generateContent(prompt: string): Promise<string> {
    logger.info("Generating content with Gemini", {
      promptLength: prompt.length,
      model: this.model,
    });

    const response = await this.makeRequest(prompt);
    const text = this.extractText(response);

    logger.info("Content generated successfully", {
      responseLength: text.length,
      tokenUsage: response.usageMetadata?.totalTokenCount || 0,
    });

    // Track cost (fire-and-forget — never blocks generation)
    // jobId is null for direct/internal calls that have no associated queue job
    costTracker.trackRequest({
      provider: "gemini",
      jobId: null as any,
      jobType: "transcript",
      tokenUsage: response.usageMetadata?.totalTokenCount || 0,
      estimatedCost: this.calculateCost(response.usageMetadata),
      timestamp: new Date(),
    }).catch(() => {/* swallow — cost tracking must not break generation */});

    return text;
  }

  /**
   * Make a request to Gemini API with retry logic
   *
   * Requirements: 19.2, 34.1
   */
  private async makeRequest(
    prompt: string,
    attempt: number = 0
  ): Promise<GeminiResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            // 32768 tokens should handle even 2+ hour videos without truncation.
            // Gemini 2.5 Flash max is 65,535 tokens, but we use 32K for safety.
            // You only pay for actual tokens generated, not the limit.
            maxOutputTokens: 32768,
            // Force JSON output — prevents markdown fences and ensures the response
            // is always valid JSON that can be parsed directly.
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 429) {
          logger.warn("Gemini rate limit hit", {
            attempt: attempt + 1,
            maxRetries: this.MAX_RETRIES,
          });

          if (attempt < this.MAX_RETRIES - 1) {
            await this.handleRateLimit(attempt);
            return this.makeRequest(prompt, attempt + 1);
          }
        }

        throw new HTTPError(response.status, `Gemini API error: ${errorText}`);
      }

      const data = await response.json();
      return data as GeminiResponse;
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error;
      }

      logger.error("Gemini API request failed", {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt + 1,
      });

      if (attempt < this.MAX_RETRIES - 1) {
        const delay = this.RETRY_DELAYS[attempt];
        logger.info("Retrying Gemini request", {
          attempt: attempt + 1,
          delay: `${delay}ms`,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeRequest(prompt, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Handle rate limit with exponential backoff
   */
  private async handleRateLimit(attempt: number): Promise<void> {
    const delay = this.RETRY_DELAYS[attempt];
    logger.info("Waiting before retry due to rate limit", {
      delay: `${delay}ms`,
      attempt: attempt + 1,
    });
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Extract text from Gemini response
   */
  private extractText(response: GeminiResponse): string {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates in Gemini response");
    }

    const candidate = response.candidates[0];
    if (
      !candidate.content ||
      !candidate.content.parts ||
      candidate.content.parts.length === 0
    ) {
      throw new Error("No content in Gemini response");
    }

    return candidate.content.parts[0].text;
  }

  /**
   * Calculate estimated cost based on token usage
   *
   * Requirements: 34.1
   */
  calculateCost(usageMetadata?: GeminiResponse["usageMetadata"]): number {
    if (!usageMetadata) return 0;

    const inputCost = usageMetadata.promptTokenCount * this.INPUT_COST_PER_TOKEN;
    const outputCost = usageMetadata.candidatesTokenCount * this.OUTPUT_COST_PER_TOKEN;

    return inputCost + outputCost;
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
