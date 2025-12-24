import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ensureTeamAccess } from "@/lib/auth/teams";
import { recordEvent } from "@/lib/telemetry/events";

type Params = Promise<{ team_id: string; user_id: string }>;

export async function DELETE(_req: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { team_id, user_id } = await context.params;
    await ensureTeamAccess(user.id, team_id, "owner");
    await sql`DELETE FROM team_memberships WHERE team_id = ${team_id} AND user_id = ${user_id};`;
    await recordEvent({
      event_name: "member_removed",
      user_id: user.id,
      plan: user.plan,
      properties: { team_id },
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove member";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { team_id, user_id } = await context.params;
    await ensureTeamAccess(user.id, team_id, "owner");
    const body = await request.json();
    const role = body?.role === "viewer" ? "viewer" : body?.role === "member" ? "member" : body?.role === "owner" ? "owner" : null;
    if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    await sql`UPDATE team_memberships SET role = ${role} WHERE team_id = ${team_id} AND user_id = ${user_id};`;
    await recordEvent({
      event_name: "role_changed",
      user_id: user.id,
      plan: user.plan,
      properties: { team_id, role },
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update role";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
