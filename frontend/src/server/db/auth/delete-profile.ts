"use server";
import { extractErrorMsg } from "@/lib/extract-error-msg";
import { errorResponseServerFunc, successResponseServerFunc } from "@/lib/server-function-response";
import { executeAccountDeletion } from "@/lib/billing/account-deletion";
import { z } from "zod";

const getDeleteProfileSchema = z.object({
    userId: z.string().uuid()
});

type DeleteProfileParamsType = z.infer<typeof getDeleteProfileSchema>;

export async function deleteProfile({ userId }: DeleteProfileParamsType) {
    try {
        const safe_params = getDeleteProfileSchema.safeParse({ userId });

        if (!safe_params.success) {
            throw new Error(`Invalid Params: ${safe_params.error.issues[0].message}`);
        }

        await executeAccountDeletion(safe_params.data.userId);

        return successResponseServerFunc<null>({
            message: "Profile deleted successfully"
        });

    } catch (error) {
        return errorResponseServerFunc({ message: extractErrorMsg(error), status: 500 });
    }
}
