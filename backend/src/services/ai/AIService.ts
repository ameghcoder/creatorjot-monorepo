// ═══════════════════════════════════════════════════════════
// 📁 /services/ai/AIService.ts — Unified AI Service (Claude + Gemini)
// ═══════════════════════════════════════════════════════════

import { logger } from "../../lib/logger.js";
import { env } from "../../utils/env.js";
import type { Platforms, SupportedLang } from "../../types/index.js";
import { ClaudeClient, type ContentGenerationParams, type ContentResult } from "./ClaudeClient.js";
import { GeminiClient } from "./GeminiClient.js";

/**
 * AI model selection strategy
 */
export type AIModel = "claude" | "gemini";

/**
 * Conditions for model selection
 */
export interface ModelSelectionConfig {
  defaultModel: AIModel;
  useClaudeFor?: {
    platforms?: Platforms[];
    languages?: SupportedLang[];
    userTiers?: string[];
    contentLength?: "short" | "long";
  };
  useGeminiFor?: {
    platforms?: Platforms[];
    languages?: SupportedLang[];
    userTiers?: string[];
    contentLength?: "short" | "long";
  };
}

/**
 * Default model selection configuration
 */
const DEFAULT_CONFIG: ModelSelectionConfig = {
  defaultModel: "gemini", // Gemini is more cost-effective
  useClaudeFor: {
    platforms: ["blog"], // Claude for long-form content
    contentLength: "long",
  },
  useGeminiFor: {
    platforms: ["x", "facebook", "linkedin", "tumblr", "email", "yt_community_post"], // Gemini for social posts
    contentLength: "short",
  },
};

/**
 * Unified AI Service that can use either Claude or Gemini based on conditions.
 * 
 * Features:
 * - Automatic model selection based on platform, language, user tier, etc.
 * - Fallback support (if Claude fails, try Gemini)
 * - Cost optimization (use cheaper model when appropriate)
 * - Same interface for both models
 * 
 * Usage:
 * ```typescript
 * const aiService = new AIService();
 * const result = await aiService.generateContent(params);
 * ```
 */
export class AIService {
  private claudeClient: ClaudeClient;
  private geminiClient: GeminiClient;
  private config: ModelSelectionConfig;

  constructor(config?: Partial<ModelSelectionConfig>) {
    this.claudeClient = new ClaudeClient();
    this.geminiClient = new GeminiClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate content using the best AI model for the given parameters
   */
  async generateContent(
    params: ContentGenerationParams,
    options?: {
      forceModel?: AIModel;
      userTier?: string;
      enableFallback?: boolean;
    }
  ): Promise<ContentResult & { modelUsed: string }> {
    const selectedModel = options?.forceModel || this.selectModel(params, options?.userTier);
    
    logger.info("Generating content with AI service", {
      platform: params.platform,
      language: params.language,
      selectedModel,
      hasTone: !!params.userSavedTone,
    });

    try {
      if (selectedModel === "claude") {
        const result = await this.claudeClient.generateContent(params);
        return { ...result, modelUsed: `claude-${result.modelUsed}` };
      } else {
        const result = await this.generateWithGemini(params);
        return { ...result, modelUsed: `gemini-${result.modelUsed}` };
      }
    } catch (error) {
      // Fallback to the other model if enabled
      if (options?.enableFallback !== false) {
        const fallbackModel = selectedModel === "claude" ? "gemini" : "claude";
        
        logger.warn("Primary model failed, trying fallback", {
          primaryModel: selectedModel,
          fallbackModel,
          error: error instanceof Error ? error.message : String(error),
        });

        try {
          if (fallbackModel === "claude") {
            const result = await this.claudeClient.generateContent(params);
            return { ...result, modelUsed: `claude-${result.modelUsed}-fallback` };
          } else {
            const result = await this.generateWithGemini(params);
            return { ...result, modelUsed: `gemini-${result.modelUsed}-fallback` };
          }
        } catch (fallbackError) {
          logger.error("Both models failed", {
            primaryError: error instanceof Error ? error.message : String(error),
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate content using Gemini with Claude-compatible prompts
   */
  private async generateWithGemini(params: ContentGenerationParams): Promise<ContentResult> {
    // Reuse ClaudeClient's buildPrompt (handles focalKeyPointSequence reordering)
    const prompt = this.claudeClient.buildPrompt(params);
    const content = await this.geminiClient.generateContent(prompt);

    const estimatedTokens = Math.ceil((prompt.length + content.length) / 4);
    const estimatedCost = estimatedTokens * (0.30 / 1_000_000);

    return {
      content,
      tokenUsage: estimatedTokens,
      modelUsed: "gemini-2.5-flash",
      estimatedCost,
    };
  }

  /**
   * Build prompt for Gemini using Claude's prompt builders
   * @deprecated Use claudeClient.buildPrompt directly
   */
  private buildPromptForGemini(params: ContentGenerationParams): string {
    return this.claudeClient.buildPrompt(params);
  }

  /**
   * Select the best AI model based on parameters and configuration
   */
  private selectModel(params: ContentGenerationParams, userTier?: string): AIModel {
    const { platform, language } = params;

    // High-scoring content on paid tiers -> claude for all platforms
    if (userTier === "pro" && params.postAngle.score >= 8) return "claude";

    // Check Claude conditions
    if (this.config.useClaudeFor) {
      const claudeConfig = this.config.useClaudeFor;
      
      if (claudeConfig.platforms?.includes(platform)) return "claude";
      if (claudeConfig.languages?.includes(language)) return "claude";
      if (userTier && claudeConfig.userTiers?.includes(userTier)) return "claude";
      if (claudeConfig.contentLength === "long" && this.isLongFormPlatform(platform)) return "claude";
    }

    // Check Gemini conditions
    if (this.config.useGeminiFor) {
      const geminiConfig = this.config.useGeminiFor;
      
      if (geminiConfig.platforms?.includes(platform)) return "gemini";
      if (geminiConfig.languages?.includes(language)) return "gemini";
      if (userTier && geminiConfig.userTiers?.includes(userTier)) return "gemini";
      if (geminiConfig.contentLength === "short" && !this.isLongFormPlatform(platform)) return "gemini";
    }

    // Fallback to default
    return this.config.defaultModel;
  }

  /**
   * Determine if a platform typically requires long-form content
   */
  private isLongFormPlatform(platform: Platforms): boolean {
    return platform === "blog";
  }

  /**
   * Update model selection configuration
   */
  updateConfig(newConfig: Partial<ModelSelectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ModelSelectionConfig {
    return { ...this.config };
  }
}

// Export singleton instance with environment-based configuration
export const aiService = new AIService({
  defaultModel: (env.AI_DEFAULT_MODEL as AIModel) || "gemini",
  useClaudeFor: {
    platforms: ["blog"], // Use Claude for long-form content
    userTiers: ["pro", "enterprise"], // Premium users get Claude
  },
  useGeminiFor: {
    platforms: ["x", "facebook", "linkedin", "tumblr", "email", "yt_community_post"], // Social posts use Gemini
    userTiers: ["free"], // Free users get Gemini
  },
});