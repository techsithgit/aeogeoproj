import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { requireUser } from "@/lib/auth/session";
import { ensureCoreTables } from "@/lib/db/schema";
import { enforceProjectQuota, resetUsageIfNeeded } from "@/lib/auth/quota";
import { recordEvent } from "@/lib/telemetry/events";
import { listMemberships, getDefaultTeamId, ensureTeamAccess } from "@/lib/auth/teams";

export async function GET() {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const memberships = await listMemberships(user.id);
    const teamIds = memberships.map((m) => m.team_id);
    if (teamIds.length === 0) return NextResponse.json({ projects: [] });
    const { rows } = await sql`
      SELECT id, name, primary_domain, industry, created_at, team_id
      FROM projects
      WHERE team_id = ANY(${teamIds}::text[])
      ORDER BY created_at DESC;
    `;
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
    const team_id = typeof body?.team_id === "string" ? body.team_id : await getDefaultTeamId(user.id);
    if (!name) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }
    if (!team_id) {
      return NextResponse.json({ error: "Team is required" }, { status: 400 });
    }
    await ensureTeamAccess(user.id, team_id, "member");
    const countRes = await sql`SELECT COUNT(*)::int AS count FROM projects WHERE team_id = ${team_id};`;
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
      INSERT INTO projects (id, user_id, team_id, name, primary_domain, industry, created_at)
      VALUES (${id}, ${user.id}, ${team_id}, ${name}, ${primary_domain}, ${industry}, ${now});
    `;
    await recordEvent({
      event_name: "project_created",
      user_id: user.id,
      plan: user.plan,
      project_id: id,
      properties: { team_id },
    });
    return NextResponse.json({ project_id: id, status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create project";
    const status = message === "Unauthorized" ? 401 : message.includes("limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
