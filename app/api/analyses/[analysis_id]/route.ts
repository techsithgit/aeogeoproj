import { NextRequest, NextResponse } from "next/server";
import { getAnalysisStore } from "@/lib/persistence";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { sql } from "@vercel/postgres";

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

    if (!record || record.user_id !== user.id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
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
    const { rows } = await sql`SELECT id FROM analyses WHERE id = ${analysis_id} AND user_id = ${user.id} LIMIT 1;`;
    if (!rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    await sql`DELETE FROM analyses WHERE id = ${analysis_id};`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete analysis";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
