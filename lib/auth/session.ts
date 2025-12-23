import { getServerSession } from "next-auth/next";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ensureCoreTables } from "@/lib/db/schema";
import { PLAN_LIMITS, PlanType } from "./plans";

export type AuthUser = {
  id: string;
  email: string;
  plan: PlanType;
  analyses_used_this_month: number;
  last_reset_at: string | null;
  allow_differentiators: boolean;
};

export async function requireUser(): Promise<AuthUser> {
  await ensureCoreTables();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const { rows } = await sql`
    SELECT id, email, plan, analyses_used_this_month, last_reset_at
    FROM users
    WHERE id = ${session.user.id}
    LIMIT 1;
  `;
  if (!rows.length) {
    throw new Error("Unauthorized");
  }
  const user = rows[0];
  const plan = user.plan as PlanType;
  const allow_differentiators = PLAN_LIMITS[plan].allow_differentiators;
  return {
    id: user.id,
    email: user.email,
    plan,
    analyses_used_this_month: user.analyses_used_this_month ?? 0,
    last_reset_at: user.last_reset_at,
    allow_differentiators,
  };
}
