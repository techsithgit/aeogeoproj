import { NextRequest, NextResponse } from "next/server";
import { getAnalysisStore } from "@/lib/persistence";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";

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
