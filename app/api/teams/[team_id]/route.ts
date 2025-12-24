import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { ensureTeamAccess } from "@/lib/auth/teams";

type Params = Promise<{ team_id: string }>;

export async function GET(_req: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { team_id } = await context.params;
    await ensureTeamAccess(user.id, team_id, "viewer");
    const teamRes = await sql`SELECT id, name, created_at FROM teams WHERE id = ${team_id} LIMIT 1;`;
    if (!teamRes.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const members = await sql`
      SELECT tm.user_id, tm.role, u.email
      FROM team_memberships tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ${team_id}
      ORDER BY tm.created_at ASC;
    `;
    const current = members.rows.find((m) => m.user_id === user.id);
    return NextResponse.json({ team: teamRes.rows[0], members: members.rows, current_role: current?.role ?? "viewer" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch team";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
