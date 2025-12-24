import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ensureTeamAccess, enforceMemberLimit, getTeamPlan } from "@/lib/auth/teams";
import { recordEvent } from "@/lib/telemetry/events";

type Params = Promise<{ team_id: string }>;

export async function POST(request: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { team_id } = await context.params;
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body?.role === "viewer" ? "viewer" : body?.role === "member" ? "member" : "member";
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    await ensureTeamAccess(user.id, team_id, "owner");
    const teamPlan = (await getTeamPlan(team_id)) || user.plan;
    await enforceMemberLimit(team_id, teamPlan);
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await sql`
      INSERT INTO team_invites (token, team_id, email, role, created_at, expires_at, created_by)
      VALUES (${token}, ${team_id}, ${email}, ${role}, NOW(), ${expires_at}, ${user.id})
      ON CONFLICT (token) DO NOTHING;
    `;
    await recordEvent({
      event_name: "member_invited",
      user_id: user.id,
      plan: user.plan,
      properties: { team_id, role },
    });
    return NextResponse.json({ invite_token: token, expires_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
