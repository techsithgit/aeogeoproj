import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import type { PlanType } from "@/lib/auth/plans";

type Action = "set_user_plan" | "set_team_billing" | "reset_user_quota";

type Body = {
  action?: Action;
  email?: string;
  team_id?: string;
  plan?: PlanType;
  subscription_status?: "active" | "past_due" | "canceled" | "trialing" | "free";
  included_seats?: number;
  purchased_seats?: number;
};

const VALID_PLANS: PlanType[] = ["free", "pro", "agency"];

function guardLocalTest(request: Request): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Local test endpoint is disabled outside development." }, { status: 403 });
  }
  const secret = process.env.LOCAL_ADMIN_TEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "LOCAL_ADMIN_TEST_SECRET is not configured." }, { status: 500 });
  }
  const header = request.headers.get("x-local-admin-secret");
  if (header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request) {
  const guard = guardLocalTest(request);
  if (guard) return guard;

  try {
    await ensureCoreTables();
    const body = (await request.json()) as Body;
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    if (action === "set_user_plan") {
      const email = body.email?.toLowerCase();
      const plan = body.plan;
      if (!email || !plan || !VALID_PLANS.includes(plan)) {
        return NextResponse.json({ error: "email and valid plan are required" }, { status: 400 });
      }
      const result = await sql`
        UPDATE users
        SET plan = ${plan}, analyses_used_this_month = 0, last_reset_at = NULL
        WHERE LOWER(email) = ${email};
      `;
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ status: "ok", action, updated: result.rowCount });
    }

    if (action === "reset_user_quota") {
      const email = body.email?.toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
      }
      const result = await sql`
        UPDATE users
        SET analyses_used_this_month = 0, last_reset_at = NOW()
        WHERE LOWER(email) = ${email};
      `;
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ status: "ok", action, updated: result.rowCount });
    }

    if (action === "set_team_billing") {
      const teamId = body.team_id;
      const plan = body.plan;
      if (!teamId || !plan || !VALID_PLANS.includes(plan)) {
        return NextResponse.json({ error: "team_id and valid plan are required" }, { status: 400 });
      }
      const includedSeats =
        typeof body.included_seats === "number" && body.included_seats >= 0
          ? Math.floor(body.included_seats)
          : plan === "pro"
            ? 3
            : plan === "agency"
              ? 10
              : 1;
      const purchasedSeats =
        typeof body.purchased_seats === "number" && body.purchased_seats >= 0
          ? Math.floor(body.purchased_seats)
          : 0;
      const subscriptionStatus = body.subscription_status ?? (plan === "free" ? "free" : "active");

      const result = await sql`
        UPDATE teams
        SET plan = ${plan},
            subscription_status = ${subscriptionStatus},
            included_seats = ${includedSeats},
            purchased_seats = ${purchasedSeats}
        WHERE id = ${teamId};
      `;
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
      return NextResponse.json({
        status: "ok",
        action,
        team_id: teamId,
        plan,
        subscription_status: subscriptionStatus,
        included_seats: includedSeats,
        purchased_seats: purchasedSeats,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local test action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
