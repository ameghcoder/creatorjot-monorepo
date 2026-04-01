"use server";
import { extractErrorMsg } from "@/lib/extract-error-msg";
import { errorResponseServerFunc, successResponseServerFunc } from "@/lib/server-function-response";
import { supabaseAdminClient } from "@/server/supabase/supabase-admin";
import { z } from "zod";

const getLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().regex(/^(?=.{8,30}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/)
})

type LoginParamsType = z.infer<typeof getLoginSchema>

export async function login({ email, password }: LoginParamsType) {
    try {
        // validated params
        const safe_params = getLoginSchema.safeParse({ email, password });

        if (!safe_params.success) {
            throw new Error(`Invalid Params: ${safe_params.error.issues[0].message}`);
        }

        const supabase = await supabaseAdminClient();

        const { error } = await supabase.auth.signInWithPassword({
            email: safe_params.data.email,
            password: safe_params.data.password
        });

        if (error) {
            throw new Error(error.message);
        }
        return successResponseServerFunc<null>({
            message: "Loggin Successfully"
        });

    } catch (error) {
        console.error("Login server action error:", error);
        return errorResponseServerFunc({ message: extractErrorMsg(error), status: 500 });
    }
}
