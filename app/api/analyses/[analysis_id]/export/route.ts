import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { PLAN_LIMITS } from "@/lib/auth/plans";
import { recordEvent } from "@/lib/telemetry/events";
import { getAnalysisStore } from "@/lib/persistence";

type Params = Promise<{ analysis_id: string }>;

export async function POST(_req: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const limits = PLAN_LIMITS[user.plan];
    if (!limits.allow_differentiators) {
      return NextResponse.json({ error: "Exports are unavailable on your plan." }, { status: 403 });
    }
    const { analysis_id } = await context.params;
    const store = getAnalysisStore();
    const record = await store.getRecord(analysis_id);
    if (!record || record.user_id !== user.id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    if (record.status !== "complete" || !record.analysis) {
      return NextResponse.json({ error: "Analysis is not complete" }, { status: 400 });
    }
    const exportId = crypto.randomUUID();
    await sql`
      INSERT INTO exports (id, analysis_id, user_id, export_type, created_at, created_by)
      VALUES (${exportId}, ${analysis_id}, ${user.id}, 'pdf', NOW(), ${user.id});
    `;
    await recordEvent({
      event_name: "export_generated",
      user_id: user.id,
      plan: user.plan,
      project_id: record.project_id,
      analysis_id,
      properties: {
        export_type: "pdf",
        differentiators_included: Boolean(record.request.include_differentiators),
      },
    });
    return NextResponse.json({ export_id: exportId, download_url: `/api/analyses/${analysis_id}/export/${exportId}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate export";
    const status = message === "Unauthorized" ? 401 : message.includes("plan") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
