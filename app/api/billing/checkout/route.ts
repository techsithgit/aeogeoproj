import { NextRequest, NextResponse } from "next/server";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ensureTeamAccess, getTeamBilling } from "@/lib/auth/teams";
import { recordEvent } from "@/lib/telemetry/events";
import { requireStripe, PRICE_PRO, PRICE_AGENCY } from "@/lib/billing/stripe";
import { sql } from "@vercel/postgres";

const PRICE_MAP: Record<string, string> = {
  pro: PRICE_PRO,
  agency: PRICE_AGENCY,
};

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const body = await request.json();
    const team_id = typeof body?.team_id === "string" ? body.team_id : "";
    const target_plan = body?.target_plan === "agency" ? "agency" : "pro";
    const seat_quantity = typeof body?.seat_quantity === "number" && body.seat_quantity > 0 ? body.seat_quantity : undefined;
    if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });
    await ensureTeamAccess(user.id, team_id, "owner");
    const billing = await getTeamBilling(team_id);
    if (billing.plan === target_plan) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }
    const stripe = requireStripe();
    const price = PRICE_MAP[target_plan];
    if (!price) return NextResponse.json({ error: "Price not configured" }, { status: 500 });

    const customerId =
      (
        await sql`SELECT stripe_customer_id FROM teams WHERE id = ${team_id} LIMIT 1;`
      ).rows[0]?.stripe_customer_id || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/projects`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/projects`,
      line_items: [
        {
          price,
          quantity: seat_quantity ?? billing.included_seats ?? 1,
        },
      ],
      subscription_data: {
        metadata: { team_id, target_plan },
      },
      metadata: { team_id, target_plan, user_id: user.id },
    });

    await recordEvent({
      event_name: "checkout_started",
      user_id: user.id,
      plan: user.plan,
      properties: { team_id, role: "owner", target_plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
