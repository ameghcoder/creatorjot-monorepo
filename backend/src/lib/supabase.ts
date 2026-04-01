// ═══════════════════════════════════════════════════════════
// 📄 /lib/supabase.ts — Supabase Client (Singleton)
// ═══════════════════════════════════════════════════════════
//
// PURPOSE:
//   Creates and exports a SINGLE Supabase client instance
//   that the entire backend reuses.
//
// WHY SINGLETON:
//   Each `createClient()` call opens a new connection pool.
//   If every file created its own client, you'd leak connections
//   and hit Supabase's connection limit fast (~20 on free tier).
//
// USAGE:
//   ```ts
//   import { supabase } from "../lib/supabase.js";
//   const { data } = await supabase.from("videos").select("*");
//   ```
//
// CONTAINS:
//   - Admin client (service role — bypasses RLS)
//   - Future: query helpers, connection health check
//
// MUST NOT CONTAIN:
//   - Business logic
//   - Route definitions
//   - Data transformations
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { env } from "../utils/env.js";

// ── Create the admin client ─────────────────────────────
// Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses Row Level Security (RLS).
//
// Why service role key (not anon key)?
//   The backend is a trusted server process — it acts on behalf of users
//   after verifying their JWT in auth.middleware.ts. Using the service role
//   key lets us perform cross-user operations (e.g., workers reading any
//   transcript row) without needing per-request RLS policies for every table.
//   RLS is still the right choice for client-facing APIs; here the server
//   itself is the security boundary.
//
// ⚠️  NEVER expose SUPABASE_SERVICE_ROLE_KEY to the frontend or any
//     client-side code. Frontend clients must use SUPABASE_ANON_KEY so
//     that RLS policies apply and users can only access their own data.
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // We don't need Supabase's built-in auth session management
      // on the backend — we handle JWT verification manually
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// ── Health Check Helper ─────────────────────────────────
// Quick way to verify the Supabase connection is alive.
// Call this during server boot or in a /health endpoint.
//
// Example:
//   ```ts
//   const isHealthy = await checkSupabaseConnection();
//   // true if connected, false if something is wrong
//   ```
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // A lightweight query — just checks that the connection works.
    // Replace "waitlist" with any table you know exists.
    const { error } = await supabase.from("transcript_queue").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
