import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceMemberLimit, getTeamPlan } from "@/lib/auth/teams";
import { recordEvent } from "@/lib/telemetry/events";

type Params = Promise<{ token: string }>;

export async function POST(_req: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { token } = await context.params;
    const { rows } = await sql`
      SELECT token, team_id, email, role, expires_at, accepted_at
      FROM team_invites
      WHERE token = ${token}
      LIMIT 1;
    `;
    const invite = rows[0];
    if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    if (invite.accepted_at) return NextResponse.json({ error: "Invite already used" }, { status: 400 });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }
    const teamPlan = (await getTeamPlan(invite.team_id)) || user.plan;
    await enforceMemberLimit(invite.team_id, teamPlan);
    await sql`
      INSERT INTO team_memberships (team_id, user_id, role, created_at)
      VALUES (${invite.team_id}, ${user.id}, ${invite.role}, NOW())
      ON CONFLICT (team_id, user_id) DO NOTHING;
    `;
    await sql`UPDATE team_invites SET accepted_at = NOW(), accepted_by = ${user.id} WHERE token = ${token};`;
    await recordEvent({
      event_name: "member_joined",
      user_id: user.id,
      plan: user.plan,
      properties: { team_id: invite.team_id, role: invite.role },
    });
    return NextResponse.json({ status: "ok", team_id: invite.team_id, role: invite.role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept invite";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
