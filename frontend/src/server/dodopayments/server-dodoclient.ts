import { DODO_PAYMENT_ENV_TYPE } from "@/types/dodopayments";
import DodoPayments from "dodopayments";

const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: process.env.DODO_PAYMENTS_ENV as DODO_PAYMENT_ENV_TYPE
});

export {
    dodoClient
}