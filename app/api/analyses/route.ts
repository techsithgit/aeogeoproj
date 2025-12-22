import { NextRequest, NextResponse } from "next/server";
import { createAnalysisId, generateAnalysis } from "@/lib/analysis/engine";
import { getAnalysisStore } from "@/lib/persistence/index";
import { AnalysisContext } from "@/lib/analysis/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const context: AnalysisContext = body?.context ?? {};
    const id = createAnalysisId();

    const store = getAnalysisStore();

    await store.createRecord(id, topic, context, "processing");
    const analysis = generateAnalysis(id, topic, context);
    await store.saveAnalysis(id, analysis, "complete");

    return NextResponse.json({ analysis_id: id, status: "complete", analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
