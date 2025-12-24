import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureCoreTables } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const secret = process.env.RESET_QUOTA_SECRET;
    if (secret) {
      const header = request.headers.get("x-reset-secret");
      if (header !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    await ensureCoreTables();
    await sql`UPDATE users SET analyses_used_this_month = 0, last_reset_at = NOW();`;
    return NextResponse.json({ status: "ok", reset: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
