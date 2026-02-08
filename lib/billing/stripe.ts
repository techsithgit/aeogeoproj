import { createRequire } from "module";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const require = createRequire(import.meta.url);

type StripeLike = {
  checkout: {
    sessions: {
      create(args: unknown): Promise<{ url?: string | null }>;
    };
  };
  billingPortal: {
    sessions: {
      create(args: unknown): Promise<{ url?: string | null }>;
    };
  };
  webhooks: {
    constructEvent(payload: Buffer, signature: string, secret: string): { type: string; data: { object: unknown } };
  };
};

function buildStripe(): StripeLike | null {
  if (!stripeSecret) return null;
  try {
    const StripeCtor = require("stripe");
    return new StripeCtor(stripeSecret, { apiVersion: "2024-06-20" }) as StripeLike;
  } catch {
    return null;
  }
}

export const stripe = buildStripe();

export const PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? "";
export const PRICE_AGENCY = process.env.STRIPE_PRICE_AGENCY ?? "";

export function requireStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured or SDK is not installed");
  }
  if (!PRICE_PRO || !PRICE_AGENCY) {
    throw new Error("Stripe price IDs are missing");
  }
  return stripe;
}
