import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { ensureTeamAccess } from "@/lib/auth/teams";

type Params = Promise<{ project_id: string }>;

export async function GET(_req: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { project_id } = await context.params;
    const projectCheck = await sql`SELECT id, team_id FROM projects WHERE id = ${project_id} LIMIT 1;`;
    if (!projectCheck.rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await ensureTeamAccess(user.id, projectCheck.rows[0].team_id, "viewer");
    const { rows } = await sql`
      SELECT id, status, created_at, updated_at, request, error
      FROM analyses
      WHERE project_id = ${project_id}
      ORDER BY created_at DESC
      LIMIT 50;
    `;
    return NextResponse.json({ analyses: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list analyses";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
