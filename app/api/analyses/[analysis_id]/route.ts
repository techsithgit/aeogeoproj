import { NextRequest, NextResponse } from "next/server";
import { getAnalysisStore } from "@/lib/persistence";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { sql } from "@vercel/postgres";
import { recordEvent } from "@/lib/telemetry/events";
import { ensureTeamAccess } from "@/lib/auth/teams";

type Params = Promise<{
  analysis_id: string;
}>;

export async function GET(_request: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { analysis_id } = await context.params;
    const store = getAnalysisStore();
    const record = await store.getRecord(analysis_id);

    if (!record) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    const projectRow = await sql`SELECT team_id FROM projects WHERE id = ${record.project_id} LIMIT 1;`;
    if (!projectRow.rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    await ensureTeamAccess(user.id, projectRow.rows[0].team_id, "viewer");

    await recordEvent({
      event_name: "analysis_viewed",
      user_id: user.id,
      plan: user.plan,
      project_id: record.project_id,
      analysis_id: record.id,
      properties: {
        source_type: record.request.source.type,
        include_differentiators: record.request.include_differentiators,
        extraction_status: record.analysis?.extraction?.status,
      },
    });
    const last = await sql`
      SELECT created_at
      FROM events
      WHERE event_name = 'analysis_viewed' AND user_id = ${user.id} AND analysis_id = ${record.id}
      ORDER BY created_at DESC
      LIMIT 1 OFFSET 1;
    `;
    if (last.rows.length) {
      const lastTime = new Date(last.rows[0].created_at).getTime();
      const now = Date.now();
      if (now - lastTime > 10 * 60 * 1000) {
        await recordEvent({
          event_name: "analysis_revisited",
          user_id: user.id,
          plan: user.plan,
          project_id: record.project_id,
          analysis_id: record.id,
        });
      }
    }

    return NextResponse.json({
      analysis_id: record.id,
      status: record.status,
      analysis: record.status === "complete" ? record.analysis : undefined,
      error: record.status === "failed" ? record.error ?? "Analysis failed" : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch analysis";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { analysis_id } = await context.params;
    const { rows } = await sql`SELECT id, project_id FROM analyses WHERE id = ${analysis_id} LIMIT 1;`;
    if (!rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    const proj = await sql`SELECT team_id FROM projects WHERE id = ${rows[0].project_id} LIMIT 1;`;
    if (!proj.rows.length) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    await ensureTeamAccess(user.id, proj.rows[0].team_id, "member");
    await sql`DELETE FROM analyses WHERE id = ${analysis_id};`;
    await recordEvent({
      event_name: "analysis_failed",
      user_id: user.id,
      plan: user.plan,
      analysis_id,
      properties: { error_code: "deleted" },
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete analysis";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
