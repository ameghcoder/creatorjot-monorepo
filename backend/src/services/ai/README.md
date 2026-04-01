# AI Service Documentation

The AI Service provides a unified interface for content generation using either Claude or Gemini models based on configurable conditions.

## Quick Start

```typescript
import { aiService } from "./services/ai/AIService.js";

// Generate content (automatically selects best model)
const result = await aiService.generateContent({
  summary: "Video about database optimization techniques",
  keyPoints: [
    {
      hook: "This one trick speeds up queries by 10x",
      summary: "Proper database indexing techniques",
      score: 9,
      tone: "informative"
    }
  ],
  platform: "x",
  language: "en",
  tone: userTone, // optional
});

console.log(result.content); // Generated social media post
console.log(result.modelUsed); // "gemini-2.5-flash" or "claude-3.5-sonnet"
```

## Model Selection

The service automatically selects the best model based on:

### Default Configuration
- **Gemini**: Social platforms (X, Facebook, LinkedIn, Tumblr, Email, YouTube Community)
- **Claude**: Long-form content (Blog posts)
- **Fallback**: Gemini (more cost-effective)

### Environment Variables
```bash
# Set default model
AI_DEFAULT_MODEL=gemini  # or "claude"

# Individual model settings
CLAUDE_API_KEY=your_claude_key
GEMINI_API_KEY=your_gemini_key
```

## Advanced Usage

### Force Specific Model
```typescript
const result = await aiService.generateContent(params, {
  forceModel: "claude", // Force Claude regardless of conditions
});
```

### User Tier-Based Selection
```typescript
const result = await aiService.generateContent(params, {
  userTier: "pro", // Pro users get Claude, free users get Gemini
});
```

### Disable Fallback
```typescript
const result = await aiService.generateContent(params, {
  enableFallback: false, // Don't try other model if primary fails
});
```

### Custom Configuration
```typescript
import { AIService } from "./services/ai/AIService.js";

const customAI = new AIService({
  defaultModel: "claude",
  useClaudeFor: {
    platforms: ["blog", "email"], // Use Claude for these platforms
    userTiers: ["pro", "enterprise"], // Premium users get Claude
    languages: ["en"], // English content uses Claude
  },
  useGeminiFor: {
    platforms: ["x", "facebook"], // Social posts use Gemini
    userTiers: ["free"], // Free users get Gemini
    languages: ["hi", "es", "de"], // Non-English uses Gemini
  },
});
```

## Cost Optimization

| Model | Input Cost | Output Cost | Best For |
|-------|------------|-------------|----------|
| **Gemini 2.5 Flash** | $0.30/1M tokens | $2.50/1M tokens | Social posts, cost-sensitive |
| **Claude 3.5 Sonnet** | $3.00/1M tokens | $15.00/1M tokens | Long-form, premium quality |

### Recommendations
- **Free users**: Gemini for all platforms
- **Pro users**: Claude for blogs, Gemini for social
- **Enterprise**: Claude for all platforms
- **High volume**: Gemini with Claude fallback

## Platform-Specific Behavior

All platforms use the same prompt structure but with platform-specific rules:

- **X/Twitter**: 280 character limit, hashtags, punchy tone
- **Facebook**: 100-250 words, conversational, CTA
- **LinkedIn**: 150-300 words, professional, hashtags
- **Blog**: 500-1000 words, structured with headings
- **Email**: Subject line + body, warm tone
- **Tumblr**: 150-500 words, casual, creative
- **YouTube Community**: 100-300 words, engaging questions

## Error Handling

The service includes automatic fallback:

1. Try primary model (based on selection rules)
2. If it fails and fallback is enabled, try secondary model
3. If both fail, throw the last error

```typescript
try {
  const result = await aiService.generateContent(params);
} catch (error) {
  // Both models failed
  console.error("Content generation failed:", error.message);
}
```

## Monitoring

The service logs model selection and performance:

```json
{
  "message": "Generating content with AI service",
  "platform": "x",
  "selectedModel": "gemini",
  "hasTone": true
}
```

## Migration from ClaudeClient

Replace direct ClaudeClient usage:

```typescript
// Before
import { claudeClient } from "./ClaudeClient.js";
const result = await claudeClient.generateContent(params);

// After
import { aiService } from "./AIService.js";
const result = await aiService.generateContent(params);
```

The interface is identical, but now you get automatic model selection and fallback support.