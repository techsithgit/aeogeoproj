import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { PLAN_LIMITS } from "@/lib/auth/plans";
import { getAnalysisStore } from "@/lib/persistence";
import { generateAnalysisPdf } from "@/lib/pdf/generate";
import { recordEvent } from "@/lib/telemetry/events";
import type { Analysis } from "@/lib/analysis/types";

type Params = Promise<{ analysis_id: string; export_id: string }>;

export async function GET(_req: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const limits = PLAN_LIMITS[user.plan];
    if (!limits.allow_differentiators) {
      return NextResponse.json({ error: "Exports are unavailable on your plan." }, { status: 403 });
    }

    const { analysis_id, export_id } = await context.params;
    const { rows } = await sql`
      SELECT e.id, e.analysis_id, e.user_id, a.project_id
      FROM exports e
      JOIN analyses a ON a.id = e.analysis_id
      WHERE e.id = ${export_id} AND e.analysis_id = ${analysis_id}
      LIMIT 1;
    `;

    const exportRow = rows[0];
    if (!exportRow || exportRow.user_id !== user.id) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    const store = getAnalysisStore();
    const record = await store.getRecord(analysis_id);
    if (!record || record.user_id !== user.id || record.status !== "complete" || !record.analysis) {
      return NextResponse.json({ error: "Analysis not available" }, { status: 404 });
    }

    const analysis = record.analysis as Analysis;
    const includeDifferentiators = limits.allow_differentiators && Boolean(record.request.include_differentiators);
    const pdfBuffer = await generateAnalysisPdf(analysis, includeDifferentiators);
    const pdfBody = new Uint8Array(pdfBuffer);

    await recordEvent({
      event_name: "export_downloaded",
      user_id: user.id,
      plan: user.plan,
      project_id: exportRow.project_id ?? undefined,
      analysis_id,
      properties: {
        export_type: "pdf",
        differentiators_included: includeDifferentiators && Boolean(analysis.differentiators),
      },
    }).catch(() => {});

    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="analysis-${analysis_id}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download export";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
