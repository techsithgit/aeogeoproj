import { NextRequest, NextResponse } from "next/server";
import { createAnalysisId, generateAnalysis } from "@/lib/analysis/engine";
import { getAnalysisStore } from "@/lib/persistence/index";
import { AnalysisContext, AnalysisSource } from "@/lib/analysis/types";
import { extractFromUrl } from "@/lib/extraction/extract";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source: AnalysisSource = (() => {
      if (body?.source?.type === "url" && typeof body.source.value === "string") {
        return { type: "url", value: body.source.value.trim() };
      }
      if (body?.source?.type === "topic" && typeof body.source.value === "string") {
        return { type: "topic", value: body.source.value.trim() };
      }
      if (typeof body?.url === "string") {
        return { type: "url", value: body.url.trim() };
      }
      if (typeof body?.topic === "string") {
        return { type: "topic", value: body.topic.trim() };
      }
      return { type: "topic", value: "" };
    })();

    if (!source.value) {
      return NextResponse.json({ error: "source value is required" }, { status: 400 });
    }

    const context: AnalysisContext = body?.context ?? {};
    const id = createAnalysisId();
    const store = getAnalysisStore();

    await store.createRecord(id, source, context, "processing");

    let extraction;
    if (source.type === "url") {
      extraction = await extractFromUrl(source.value);
      if (extraction.status === "failed") {
        await store.markFailed(id, extraction.warnings?.[0] ?? "Extraction failed");
        return NextResponse.json({ error: "Extraction failed", details: extraction.warnings }, { status: 500 });
      }
    }

    const topicHint =
      source.type === "topic"
        ? source.value
        : extraction?.content.title ||
          extraction?.content.headings?.[0] ||
          extraction?.content.description ||
          source.value;

    const analysis = generateAnalysis({
      id,
      source,
      topicHint,
      context,
      extraction,
    });
    await store.saveAnalysis(id, analysis, "complete");

    return NextResponse.json({ analysis_id: id, status: "complete", analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
