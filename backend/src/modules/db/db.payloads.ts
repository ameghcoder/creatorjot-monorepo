import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";
import { z } from "zod";

// ── Payload Insert Schema ───────────────────────────────
// Validates payload data before inserting into the database.
// Matches the database constraints from the payloads table.
//
// Database Constraints:
// - input_type must be one of: youtube, prompt, url, file
// - If input_type = 'youtube', 'url', or 'file' → yt_id is required
// - If input_type = 'prompt' → prompt_text is required
// - user_id and session_id are always required
const PayloadInsertSchema = z
  .object({
    user_id: z.uuid("user_id must be a valid UUID"),
    session_id: z.uuid("session_id must be a valid UUID"),
    input_type: z
      .enum(["youtube", "prompt", "url", "file"])
      .default("youtube"),
    yt_id: z.string().min(1).optional().nullable(),
    prompt_text: z.string().min(1).optional().nullable(),
    output_lang: z.enum(["en", "hi", "es", "de"]).default("en"),
    user_tone_id: z.string().optional().nullable(),
    settings: z.record(z.string(), z.any()).default({}),
  })
  .refine(
    (data) => {
      // Validate based on input_type
      if (
        data.input_type === "youtube" ||
        data.input_type === "url" ||
        data.input_type === "file"
      ) {
        return data.yt_id !== null && data.yt_id !== undefined;
      }
      if (data.input_type === "prompt") {
        return (
          data.prompt_text !== null && data.prompt_text !== undefined
        );
      }
      return true;
    },
    {
      message:
        "yt_id is required for youtube/url/file input types, prompt_text is required for prompt input type",
    },
  );

export type PayloadInsert = z.infer<typeof PayloadInsertSchema>;

export async function savePayloads({
  payloads,
}: {
  payloads: {
    user_id: string;
    input_type?: "youtube" | "prompt" | "url" | "file";
    yt_id?: string;
    prompt_text?: string;
    output_lang?: "en" | "hi" | "es" | "de";
    session_id: string;
    user_tone_id?: string | null;
    settings?: Record<string, unknown>;
  };
}): Promise<string | null> {
  logger.debug("Saving Payloads: to supabase for YT post gen", {
    payloads,
  });

  // ── Validate payload data ────────────────────────────
  const validation = PayloadInsertSchema.safeParse(payloads);

  if (!validation.success) {
    logger.error("Payload validation failed", {
      errors: z.treeifyError(validation.error).errors,
      payloads,
    });
    return null;
  }

  const validatedData = validation.data;

  // ── Insert into database ─────────────────────────────
  const { data, error } = await supabase
    .from("payloads")
    .insert({
      user_id: validatedData.user_id,
      input_type: validatedData.input_type,
      yt_id: validatedData.yt_id ?? null,
      prompt_text: validatedData.prompt_text ?? null,
      output_lang: validatedData.output_lang,
      user_tone_id: validatedData.user_tone_id ?? null,
      settings: validatedData.settings,
      session_id: validatedData.session_id,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to save payload", { error });
    return null;
  }

  logger.debug("Payload saved successfully", { id: data.id });
  return data.id;
}
