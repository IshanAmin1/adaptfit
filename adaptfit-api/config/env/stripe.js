import { getEnvVariable } from "../../utils/general.js";

export const STRIPE_WEBHOOK_SECRET = getEnvVariable("STRIPE_WEBHOOK_SECRET");
export const STRIPE_SECRET_KEY = getEnvVariable("STRIPE_SECRET_KEY");
export const STRIPE_MONTHLY_PRICE_ID = getEnvVariable(
	"STRIPE_MONTHLY_PRICE_ID",
);
