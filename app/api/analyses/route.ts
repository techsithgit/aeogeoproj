import { NextRequest, NextResponse } from "next/server";
import { createAnalysisId, generateAnalysis } from "@/lib/analysis/engine";
import { getAnalysisStore } from "@/lib/persistence/index";
import { AnalysisContext, AnalysisSource } from "@/lib/analysis/types";
import { extractFromUrl } from "@/lib/extraction/extract";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { allowDifferentiators, incrementUsage, resetUsageIfNeeded } from "@/lib/auth/quota";
import { PLAN_LIMITS } from "@/lib/auth/plans";
import { recordEvent, latencyBucket, getHostname } from "@/lib/telemetry/events";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const user = await resetUsageIfNeeded(await requireUser());
    const limits = PLAN_LIMITS[user.plan];
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

    if (user.analyses_used_this_month >= limits.max_analyses_per_month) {
      await recordEvent({
        event_name: "quota_exceeded",
        user_id: user.id,
        plan: user.plan,
        project_id,
        properties: { error_code: "analysis_limit" },
      });
      return NextResponse.json({ error: "Monthly analysis quota reached for your plan." }, { status: 429 });
    }
    const includeDifferentiatorsRequested = Boolean(body?.include_differentiators);
    const includeDifferentiators = includeDifferentiatorsRequested && allowDifferentiators(user);
    const differentiatorsBlocked = includeDifferentiatorsRequested && !includeDifferentiators;

    const start = Date.now();

    await store.createRecord(id, source, context, "processing", user.id, project_id, includeDifferentiators);
    await recordEvent({
      event_name: "analysis_created",
      user_id: user.id,
      plan: user.plan,
      project_id,
      analysis_id: id,
      properties: {
        source_type: source.type,
        include_differentiators: includeDifferentiatorsRequested,
        hostname: source.type === "url" ? getHostname(source.value) : undefined,
      },
    });
    if (includeDifferentiatorsRequested) {
      await recordEvent({
        event_name: "differentiators_requested",
        user_id: user.id,
        plan: user.plan,
        project_id,
        analysis_id: id,
        properties: { include_differentiators: true },
      });
    }
    if (differentiatorsBlocked) {
      await recordEvent({
        event_name: "differentiators_blocked_by_plan",
        user_id: user.id,
        plan: user.plan,
        project_id,
        analysis_id: id,
      });
    }

    let extraction;
    if (source.type === "url") {
      extraction = await extractFromUrl(source.value);
      if (extraction.status === "failed") {
        await store.markFailed(id, extraction.warnings?.[0] ?? "Extraction failed");
        await recordEvent({
          event_name: "analysis_failed",
          user_id: user.id,
          plan: user.plan,
          project_id,
          analysis_id: id,
          properties: {
            source_type: source.type,
            extraction_status: extraction.status,
            error_code: "extraction_failed",
            include_differentiators: includeDifferentiatorsRequested,
          },
        });
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
    const latency = latencyBucket(Date.now() - start);
    await recordEvent({
      event_name: "analysis_completed",
      user_id: user.id,
      plan: user.plan,
      project_id,
      analysis_id: id,
      properties: {
        source_type: source.type,
        extraction_status: extraction?.status,
        include_differentiators: includeDifferentiatorsRequested,
        analysis_status: analysis.status,
        latency_bucket: latency,
        hostname: source.type === "url" ? getHostname(source.value) : undefined,
      },
    });

    return NextResponse.json({ analysis_id: id, status: "complete", analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create analysis";
    const status = message === "Unauthorized" ? 401 : message.includes("quota") || message.includes("limit") ? 429 : 500;
    try {
      const user = await requireUser();
      await recordEvent({
        event_name: "analysis_failed",
        user_id: user.id,
        plan: user.plan,
        properties: { error_code: status === 429 ? "quota" : "server_error" },
      });
    } catch {
      // ignore telemetry errors in failure path
    }
    return NextResponse.json({ error: message }, { status });
  }
}
