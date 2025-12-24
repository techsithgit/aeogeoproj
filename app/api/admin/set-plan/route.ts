import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import type { PlanType } from "@/lib/auth/plans";

type Body = {
  email?: string;
  plan?: PlanType;
};

const VALID_PLANS: PlanType[] = ["free", "pro", "agency"];

export async function POST(request: Request) {
  try {
    const caller = await requireUser();
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (!adminEmail || caller.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: Body = await request.json();
    const email = body.email?.toLowerCase();
    const plan = body.plan;
    if (!email || !plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "email and plan are required" }, { status: 400 });
    }

    await ensureCoreTables();
    const result = await sql`
      UPDATE users
      SET plan = ${plan}, analyses_used_this_month = 0, last_reset_at = NULL
      WHERE LOWER(email) = ${email};
    `;
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", updated: result.rowCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set plan";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
