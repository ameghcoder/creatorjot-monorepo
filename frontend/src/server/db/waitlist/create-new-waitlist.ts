"use server";

import { extractErrorMsg } from "@/lib/extract-error-msg";
import generatePromoCode from "@/lib/generate-promo-code";
import { supabaseAdminClient } from "@/server/supabase/supabase-admin";

export default async function createNewWaitlist(email: string): Promise<{
  success: boolean;
  data?: string;
  message?: string;
}> {
  try {
    const supabase = await supabaseAdminClient();

    const newPromoCode = generatePromoCode();

    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email_id: email,
        promo_code: newPromoCode,
      })
      .select()
      .single();

    if (error?.code === "23505") {
      throw new Error("This email already exists");
    }

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: newPromoCode,
    };
  } catch (err) {
    return {
      success: false,
      message: extractErrorMsg(err),
    };
  }
}
