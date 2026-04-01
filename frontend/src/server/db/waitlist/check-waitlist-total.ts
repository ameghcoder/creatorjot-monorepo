"use server";

import { extractErrorMsg } from "@/lib/extract-error-msg";
import { supabaseAdminClient } from "@/server/supabase/supabase-admin";

export default async function waitlistTotal(): Promise<{
  success: boolean;
  data?: number;
  message?: string;
}> {
  try {
    const supabase = await supabaseAdminClient();

    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: (count ?? 0) + 150,
    };
  } catch (err) {
    return {
      success: false,
      message: extractErrorMsg(err),
    };
  }
}
