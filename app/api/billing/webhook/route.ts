import { NextRequest, NextResponse } from "next/server";
import { buffer } from "node:stream/consumers";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireStripe, PRICE_PRO, PRICE_AGENCY } from "@/lib/billing/stripe";
import { sql } from "@vercel/postgres";
import { recordEvent } from "@/lib/telemetry/events";

export const dynamic = "force-dynamic";

const priceToPlan: Record<string, "pro" | "agency"> = {
  [PRICE_PRO]: "pro",
  [PRICE_AGENCY]: "agency",
};

type StripeSub = {
  id?: string;
  status?: string;
  current_period_end?: number;
  items?: { data?: { price?: { id?: string }; quantity?: number }[] };
  customer?: string;
  metadata?: Record<string, string>;
};

type StripeSession = {
  id?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

type StripeInvoice = {
  subscription?: string;
};

async function updateTeamPlan(team_id: string, plan: "free" | "pro" | "agency", subscription?: StripeSub) {
  const included = plan === "pro" ? 3 : plan === "agency" ? 10 : 1;
  const status = subscription?.status ?? null;
  const current_period_end = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const purchased = subscription?.items?.data?.[0]?.quantity
    ? Math.max(0, (subscription.items.data?.[0]?.quantity ?? 0) - included)
    : 0;
  await sql`
    UPDATE teams
    SET plan = ${plan},
        stripe_customer_id = COALESCE(stripe_customer_id, ${subscription?.customer as string | null}),
        stripe_subscription_id = ${subscription?.id as string | null},
        subscription_status = ${status},
        current_period_end = ${current_period_end},
        included_seats = ${included},
        purchased_seats = ${purchased},
        updated_at = NOW()
    WHERE id = ${team_id};
  `;
}

export async function POST(request: NextRequest) {
  const stripe = requireStripe();
  const rawBody = await buffer(request.body as ReadableStream);
  const sig = request.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  try {
    await ensureCoreTables();
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as StripeSession;
        const team_id = session.metadata?.team_id;
        const target_plan = session.metadata?.target_plan === "agency" ? "agency" : "pro";
        if (team_id) {
          await updateTeamPlan(team_id, target_plan, session.subscription ? { id: session.subscription } : undefined);
          await recordEvent({
            event_name: "checkout_completed",
            user_id: session.metadata?.user_id || "unknown",
            plan: target_plan,
            properties: { team_id, target_plan },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as StripeSub;
        const planId = subscription.items?.data?.[0]?.price?.id;
        const plan = planId ? priceToPlan[planId] : undefined;
        const team_id = subscription.metadata?.team_id;
        if (team_id && plan) {
          await updateTeamPlan(team_id, plan, subscription);
          await recordEvent({
            event_name: "subscription_activated",
            user_id: "system",
            plan,
            properties: { team_id, subscription_status: subscription.status },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as StripeSub;
        const team_id = subscription.metadata?.team_id;
        if (team_id) {
          await updateTeamPlan(team_id, "free");
          await recordEvent({
            event_name: "subscription_canceled",
            user_id: "system",
            plan: "free",
            properties: { team_id },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeInvoice;
        const team_id = invoice.subscription ? invoice.subscription : undefined;
        await recordEvent({
          event_name: "payment_failed",
          user_id: "system",
          plan: "free",
          properties: { team_id },
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
