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
    const { rows } = await sql`
      SELECT id, name, primary_domain, industry, created_at, team_id
      FROM projects
      WHERE id = ${project_id}
      LIMIT 1;
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await ensureTeamAccess(user.id, rows[0].team_id, "viewer");
    return NextResponse.json({ project: rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch project";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
