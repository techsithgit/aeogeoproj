import { NextRequest, NextResponse } from "next/server";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ensureTeamAccess } from "@/lib/auth/teams";
import { requireStripe } from "@/lib/billing/stripe";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const body = await request.json();
    const team_id = typeof body?.team_id === "string" ? body.team_id : "";
    if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });
    await ensureTeamAccess(user.id, team_id, "owner");
    const { rows } = await sql`SELECT stripe_customer_id FROM teams WHERE id = ${team_id} LIMIT 1;`;
    const customer = rows[0]?.stripe_customer_id;
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    const stripe = requireStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/projects`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create portal session";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
