import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceTeamLimits, listMemberships } from "@/lib/auth/teams";
import { recordEvent } from "@/lib/telemetry/events";

export async function GET() {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const memberships = await listMemberships(user.id);
    return NextResponse.json({ teams: memberships.map((m) => ({ id: m.team_id, name: m.name, role: m.role })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list teams";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    await enforceTeamLimits(user);
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Team name required" }, { status: 400 });
    const teamId = crypto.randomUUID();
    await sql`INSERT INTO teams (id, name, created_at) VALUES (${teamId}, ${name}, NOW());`;
    await sql`
      INSERT INTO team_memberships (team_id, user_id, role, created_at)
      VALUES (${teamId}, ${user.id}, 'owner', NOW())
      ON CONFLICT DO NOTHING;
    `;
    await recordEvent({
      event_name: "team_created",
      user_id: user.id,
      plan: user.plan,
      properties: { team_id: teamId },
    });
    return NextResponse.json({ team_id: teamId, status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create team";
    const status = message === "Unauthorized" ? 401 : message.includes("limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
