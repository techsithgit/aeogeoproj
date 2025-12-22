import { NextRequest, NextResponse } from "next/server";
import { getAnalysisStore } from "@/lib/persistence";

type Params = Promise<{
  analysis_id: string;
}>;

export async function GET(_request: NextRequest, context: { params: Params }) {
  try {
    const { analysis_id } = await context.params;
    const store = getAnalysisStore();
    const record = await store.getRecord(analysis_id);

    if (!record) {
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
