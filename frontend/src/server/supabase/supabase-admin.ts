// server/supabase/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client cannot be used on the client side");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
