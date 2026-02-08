import { NextRequest, NextResponse } from "next/server";
import { ensureCoreTables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { ensureTeamAccess, getTeamBilling } from "@/lib/auth/teams";

export async function GET(request: NextRequest) {
  try {
    await ensureCoreTables();
    const user = await requireUser();
    const team_id = request.nextUrl.searchParams.get("team_id");
    if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });
    await ensureTeamAccess(user.id, team_id, "owner");
    const billing = await getTeamBilling(team_id);
    return NextResponse.json({
      team_id,
      plan: billing.plan,
      subscription_status: billing.subscription_status ?? "free",
      seat_usage: billing.seat_usage,
      seat_limit: billing.seat_limit,
      included_seats: billing.included_seats,
      purchased_seats: billing.purchased_seats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch billing status";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
