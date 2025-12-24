import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { recordEvent } from "@/lib/telemetry/events";

type Params = Promise<{ analysis_id: string }>;

export async function POST(_request: Request, context: { params: Params }) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const { analysis_id } = await context.params;
    const analysisCheck = await sql`SELECT project_id FROM analyses WHERE id = ${analysis_id} AND user_id = ${user.id} LIMIT 1;`;
    if (!analysisCheck.rows.length) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    const project_id = analysisCheck.rows[0].project_id as string | undefined;
    await recordEvent({
      event_name: "export_requested",
      user_id: user.id,
      plan: user.plan,
      project_id,
      analysis_id,
    });
    return NextResponse.json({ status: "recorded", message: "Export not implemented; intent recorded." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record export intent";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
