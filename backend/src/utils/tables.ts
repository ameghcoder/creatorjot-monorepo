/**
 * Centralized table configuration.
 *
 * All table names will be stored here, so instead of hardcoded table name,
 * user can use the table object.
 *
 * @example
 * ```ts
 * import { table } from "@/utils/table.js";
 * console.log(table.VIDEO); // typed & auto-completed
 * console.log(table.PAYLOADS); // typed & auto-completed
 * console.log(table.USER); // typed & auto-completed
 * ```
 */
// ! CAUTION: Before using this object, cross check with the supabase table, is table exists or not

export const tables = {
  VIDEO: {
    TRANSCRIPT: "transcript",
    PAYLOADS: "payloads",
    GENERATIONS: "generations",
    VIDEO_USAGE: "video_usage",
  },
  USER: {
    USER_TONE: "user_tone",
  },
};
