import { z } from "zod";
import { extractVideoId } from "../../services/youtube.service.js";
import { ALLOWED_PLATFORMS, TONE_PRESETS } from "@creatorjot/shared";

const supportedLangSchema = z.enum(["en", "hi", "es", "de"], {
  message: "Language must be one of: en, hi, es, de",
});

const platformSchema = z.enum(ALLOWED_PLATFORMS, {
  message:
    "Platform must be one of: x, linkedin, blog, yt_community_post, facebook, tumblr, email",
});

const settingsSchema = z
  .object({
    auto_generate: z.boolean().optional().default(false),
    platforms: z.array(platformSchema).optional().default([]),
    x_post_format: z
      .enum(["short", "long", "thread"])
      .optional()
      .default("short"),
    is_regeneration: z.boolean().optional().default(false),
    selected_hook_index: z.number().int().optional(),
    selected_hook_text: z.string().optional(),
  })
  .optional();

const youtubeUrlOrId = z
  .string()
  .min(1, "YouTube URL or ID is required")
  .refine(
    (val) => {
      const videoId = extractVideoId(val);
      return videoId !== null;
    },
    { message: "Must be a valid YouTube URL or 11-character video ID" },
  );

export const PayloadSchema = z.object({
  url: youtubeUrlOrId,
  output_lang: supportedLangSchema.optional().default("en"),

  // ── Tone options (mutually exclusive, all optional) ──────
  // Priority in worker: user_tone_id > tone_preset > tone_custom > undefined (no tone)
  user_tone_id: z
    .string()
    .uuid("user_tone_id must be a valid UUID")
    .optional()
    .nullable(),
  tone_preset: z
    .enum(TONE_PRESETS as [string, ...string[]])
    .optional()
    .nullable(),
  tone_custom: z
    .string()
    .max(500, "Custom tone must be 500 characters or less")
    .optional()
    .nullable(),

  settings: settingsSchema,
  sessionId: z.uuid("sessionId must be a valid UUID").optional(),
});

export const getVideoByIdSchema = z.object({
  id: z.uuid("Must be a valid UUID"),
});

export type PayloadInput = z.infer<typeof PayloadSchema>;
export type GetVideoByIdInput = z.infer<typeof getVideoByIdSchema>;
