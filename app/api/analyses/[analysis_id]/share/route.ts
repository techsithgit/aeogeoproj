import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { PLAN_LIMITS } from "@/lib/auth/plans";
import { recordEvent } from "@/lib/telemetry/events";

type Params = Promise<{ analysis_id: string }>;

export async function POST(_req: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const limits = PLAN_LIMITS[user.plan];
    if (!limits.allow_differentiators) {
      return NextResponse.json({ error: "Share links are unavailable on your plan." }, { status: 403 });
    }
    const { analysis_id } = await context.params;
    const analysis = await sql`
      SELECT id, project_id, status
      FROM analyses
      WHERE id = ${analysis_id} AND user_id = ${user.id}
      LIMIT 1;
    `;
    if (!analysis.rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    if (analysis.rows[0].status !== "complete") {
      return NextResponse.json({ error: "Analysis is not complete" }, { status: 400 });
    }
    const token = crypto.randomUUID();
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO share_links (id, analysis_id, user_id, token, enabled, revoked_at)
      VALUES (${id}, ${analysis_id}, ${user.id}, ${token}, true, NULL)
      ON CONFLICT (analysis_id) DO UPDATE SET token = ${token}, enabled = true, revoked_at = NULL;
    `;
    await recordEvent({
      event_name: "share_link_created",
      user_id: user.id,
      plan: user.plan,
      project_id: analysis.rows[0].project_id,
      analysis_id,
    });
    return NextResponse.json({ share_url: `/share/${token}`, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create share link";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { analysis_id } = await context.params;
    const analysis = await sql`
      SELECT id, project_id
      FROM analyses
      WHERE id = ${analysis_id} AND user_id = ${user.id}
      LIMIT 1;
    `;
    if (!analysis.rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    await sql`UPDATE share_links SET enabled = false, revoked_at = NOW() WHERE analysis_id = ${analysis_id};`;
    await recordEvent({
      event_name: "share_link_revoked",
      user_id: user.id,
      plan: user.plan,
      project_id: analysis.rows[0].project_id,
      analysis_id,
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke share link";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
