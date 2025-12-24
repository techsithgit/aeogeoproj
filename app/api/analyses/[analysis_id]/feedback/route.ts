import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { recordEvent } from "@/lib/telemetry/events";

type Params = Promise<{ analysis_id: string }>;

export async function POST(request: NextRequest, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { analysis_id } = await context.params;
    const body = await request.json();
    const feedback = body?.feedback === "up" ? "up" : "down";
    const helpful_part = body?.helpful_part;

    const analysisCheck = await sql`SELECT project_id FROM analyses WHERE id = ${analysis_id} AND user_id = ${user.id} LIMIT 1;`;
    if (!analysisCheck.rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    const project_id = analysisCheck.rows[0].project_id as string | undefined;

    await recordEvent({
      event_name: "feedback_submitted",
      user_id: user.id,
      plan: user.plan,
      project_id,
      analysis_id,
      properties: {
        feedback,
        helpful_part,
      },
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit feedback";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
