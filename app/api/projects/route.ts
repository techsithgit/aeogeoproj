import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { enforceProjectQuota, resetUsageIfNeeded } from "@/lib/auth/quota";
import { recordEvent } from "@/lib/telemetry/events";

export async function GET() {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { rows } = await sql`SELECT id, name, primary_domain, industry, created_at FROM projects WHERE user_id = ${user.id} ORDER BY created_at DESC;`;
    return NextResponse.json({ projects: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list projects";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureCoreTables();
    const user = await resetUsageIfNeeded(await requireUser());
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const primary_domain = typeof body?.primary_domain === "string" ? body.primary_domain.trim() : null;
    const industry = typeof body?.industry === "string" ? body.industry.trim() : null;
    if (!name) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }
    const countRes = await sql`SELECT COUNT(*)::int AS count FROM projects WHERE user_id = ${user.id};`;
    try {
      enforceProjectQuota(user, countRes.rows[0].count);
    } catch (err) {
      await recordEvent({
        event_name: "quota_exceeded",
        user_id: user.id,
        plan: user.plan,
        properties: { error_code: "project_limit" },
      });
      throw err;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO projects (id, user_id, name, primary_domain, industry, created_at)
      VALUES (${id}, ${user.id}, ${name}, ${primary_domain}, ${industry}, ${now});
    `;
    await recordEvent({
      event_name: "project_created",
      user_id: user.id,
      plan: user.plan,
      project_id: id,
    });
    return NextResponse.json({ project_id: id, status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create project";
    const status = message === "Unauthorized" ? 401 : message.includes("limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
