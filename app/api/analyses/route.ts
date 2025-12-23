import { NextRequest, NextResponse } from "next/server";
import { createAnalysisId, generateAnalysis } from "@/lib/analysis/engine";
import { getAnalysisStore } from "@/lib/persistence/index";
import { AnalysisContext, AnalysisSource } from "@/lib/analysis/types";
import { extractFromUrl } from "@/lib/extraction/extract";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { allowDifferentiators, enforceAnalysisQuota, incrementUsage, resetUsageIfNeeded } from "@/lib/auth/quota";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const user = await resetUsageIfNeeded(await requireUser());
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

    const project_id = typeof body?.project_id === "string" ? body.project_id : body?.request?.project_id;
    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    const projectCheck = await sql`SELECT id FROM projects WHERE id = ${project_id} AND user_id = ${user.id} LIMIT 1;`;
    if (!projectCheck.rows.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const context: AnalysisContext = body?.context ?? {};
    const id = createAnalysisId();
    const store = getAnalysisStore();

    enforceAnalysisQuota(user);
    const includeDifferentiatorsRequested = Boolean(body?.include_differentiators);
    const includeDifferentiators = includeDifferentiatorsRequested && allowDifferentiators(user);

    await store.createRecord(id, source, context, "processing", user.id, project_id, includeDifferentiators);

    let extraction;
    if (source.type === "url") {
      extraction = await extractFromUrl(source.value);
      if (extraction.status === "failed") {
        await store.markFailed(id, extraction.warnings?.[0] ?? "Extraction failed");
        return NextResponse.json(
          { error: "Extraction failed", details: extraction.warnings ?? ["Extraction failed"] },
          { status: 500 }
        );
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
      includeDifferentiators,
    });
    await store.saveAnalysis(id, analysis, "complete");
    await incrementUsage(user.id);

    return NextResponse.json({ analysis_id: id, status: "complete", analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create analysis";
    const status = message === "Unauthorized" ? 401 : message.includes("quota") || message.includes("limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
