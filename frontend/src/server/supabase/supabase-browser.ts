    // lib/supabase/client.ts
    import { createBrowserClient } from "@supabase/ssr";

    // Validate required env variables at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    export const createBrowserSupabaseClient = () => {
        try {
            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error("Missing Supabase environment variables");
            }
            return createBrowserClient(supabaseUrl, supabaseAnonKey);
        } catch (error) {
            // Return a fallback client or re-throw depending on your error handling strategy
            throw error;
        }
    };
