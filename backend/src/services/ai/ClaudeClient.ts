// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/ClaudeClient.ts — Claude AI Client for Content Generation
// ═══════════════════════════════════════════════════════════

import { logger } from "../../lib/logger.js";
import { env } from "../../utils/env.js";
import { HTTPError } from "../../worker/ErrorHandler.js";
import { costTracker } from "./CostTracker.js";
import type { Platforms, SupportedLang, PostAngle, XPostFormat } from "../../types/index.js";
import {
  buildXPrompt,
  buildFacebookPrompt,
  buildLinkedInPrompt,
  buildTumblrPrompt,
  buildEmailPrompt,
  buildBlogPrompt,
  buildYTCommunityPrompt,
} from "./prompts/claude.prompts.js";

/**
 * Content generation parameters
 */
export interface ContentGenerationParams {
  postAngle: PostAngle;
  videoSummary: string;
  platform: Platforms;
  language: SupportedLang;
  userSavedTone?: string; // tone_prompt text from UserTone record
  xPostFormat?: XPostFormat; // x/twitter only — ignored for other platforms
}

/**
 * Content generation result
 */
export interface ContentResult {
  content: string;
  tokenUsage: number;
  modelUsed: string;
  estimatedCost: number;
}

/**
 * Claude API response types
 */
interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * ClaudeClient generates platform-specific social media content.
 * 
 * Uses Claude 3.5 Sonnet model for high-quality content generation.
 * 
 * Responsibilities:
 * - Generate platform-specific content from transcript summaries
 * - Apply platform-specific constraints (character limits, formatting)
 * - Apply user tone preferences when specified
 * - Handle rate limits with exponential backoff
 * - Track token usage and estimated costs
 * 
 * Requirements: 5.6, 5.7, 19.3, 34.2
 */
export class ClaudeClient {
  private readonly apiKey: string;
  private readonly model: string = "claude-3-5-sonnet-20241022";
  private readonly baseUrl: string = "https://api.anthropic.com/v1";
  
  // Pricing for Claude 3.5 Sonnet (as of 2024)
  // Input: $3.00 per 1M tokens
  // Output: $15.00 per 1M tokens
  private readonly INPUT_COST_PER_TOKEN = 3.00 / 1_000_000;
  private readonly OUTPUT_COST_PER_TOKEN = 15.00 / 1_000_000;

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.CLAUDE_API_KEY;
    
    if (!this.apiKey) {
      throw new Error("Claude API key is required");
    }
  }

  /**
   * Generate platform-specific content
   * 
   * Requirements: 5.6, 5.7
   */
  async generateContent(params: ContentGenerationParams): Promise<ContentResult> {
      logger.info("Generating content with Claude", {
        platform: params.platform,
        language: params.language,
        hasTone: !!params.userSavedTone,
        model: this.model,
      });

      const prompt = this.buildPrompt(params);
      const response = await this.makeRequest(prompt);

      const content = this.extractText(response);
      const tokenUsage = response.usage.input_tokens + response.usage.output_tokens;
      const estimatedCost = this.calculateCost(response.usage);

      logger.info("Content generated successfully", {
        platform: params.platform,
        contentLength: content.length,
        tokenUsage,
        estimatedCost: `${estimatedCost.toFixed(6)}`,
      });

      // Track cost (fire-and-forget)
      costTracker.trackRequest({
        provider: "claude",
        jobId: "direct",
        jobType: "generation",
        tokenUsage,
        estimatedCost,
        timestamp: new Date(),
      }).catch(() => {/* swallow */});

      return {
        content,
        tokenUsage,
        modelUsed: this.model,
        estimatedCost,
      };
    }


  /**
   * Build prompt with platform-specific constraints
   *
   * Requirements: 5.1, 5.2, 5.5
   */
  buildPrompt(params: ContentGenerationParams): string {
    const { postAngle, videoSummary, platform, language, userSavedTone } = params;

    switch (platform) {
      case "x":
        return buildXPrompt(postAngle, videoSummary, language, userSavedTone, params.xPostFormat);
      case "facebook":
        return buildFacebookPrompt(postAngle, videoSummary, language, userSavedTone);
      case "linkedin":
        return buildLinkedInPrompt(postAngle, videoSummary, language, userSavedTone);
      case "tumblr":
        return buildTumblrPrompt(postAngle, videoSummary, language, userSavedTone);
      case "email":
        return buildEmailPrompt(postAngle, videoSummary, language, userSavedTone);
      case "blog":
        return buildBlogPrompt(postAngle, videoSummary, language, userSavedTone);
      case "yt_community_post":
        return buildYTCommunityPrompt(postAngle, videoSummary, language, userSavedTone);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Make a request to Claude API with retry logic
   * 
   * Requirements: 19.3, 34.2
   */
  private async makeRequest(
    prompt: string,
    attempt: number = 0
  ): Promise<ClaudeResponse> {
    const url = `${this.baseUrl}/messages`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limit errors
        if (response.status === 429) {
          logger.warn("Claude rate limit hit", {
            attempt: attempt + 1,
            maxRetries: this.MAX_RETRIES,
          });
          
          if (attempt < this.MAX_RETRIES - 1) {
            await this.handleRateLimit(attempt);
            return this.makeRequest(prompt, attempt + 1);
          }
        }

        throw new HTTPError(
          response.status,
          `Claude API error: ${errorText}`
        );
      }

      const data = await response.json();
      return data as ClaudeResponse;
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error;
      }

      logger.error("Claude API request failed", {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt + 1,
      });

      // Retry on network errors
      if (attempt < this.MAX_RETRIES - 1) {
        const delay = this.RETRY_DELAYS[attempt];
        logger.info("Retrying Claude request", {
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
   * Extract text from Claude response
   */
  private extractText(response: ClaudeResponse): string {
    if (!response.content || response.content.length === 0) {
      throw new Error("No content in Claude response");
    }

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent) {
      throw new Error("No text content in Claude response");
    }

    return textContent.text;
  }

  /**
   * Calculate estimated cost based on token usage
   * 
   * Requirements: 34.2
   */
  private calculateCost(usage: ClaudeResponse["usage"]): number {
    const inputCost = usage.input_tokens * this.INPUT_COST_PER_TOKEN;
    const outputCost = usage.output_tokens * this.OUTPUT_COST_PER_TOKEN;

    return inputCost + outputCost;
  }
}

// Export singleton instance
export const claudeClient = new ClaudeClient();
