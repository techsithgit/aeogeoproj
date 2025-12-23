import { sql } from "@vercel/postgres";
import { PLAN_LIMITS, PlanType } from "./plans";
import { AuthUser } from "./session";

function sameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

export async function resetUsageIfNeeded(user: AuthUser): Promise<AuthUser> {
  const now = new Date();
  const last = user.last_reset_at ? new Date(user.last_reset_at) : null;
  if (last && sameMonth(now, last)) return user;
  await sql`
    UPDATE users
    SET analyses_used_this_month = 0,
        last_reset_at = ${now.toISOString()}
    WHERE id = ${user.id};
  `;
  return { ...user, analyses_used_this_month: 0, last_reset_at: now.toISOString() };
}

export async function incrementUsage(userId: string) {
  await sql`
    UPDATE users
    SET analyses_used_this_month = analyses_used_this_month + 1
    WHERE id = ${userId};
  `;
}

export function enforceProjectQuota(user: AuthUser, projectCount: number) {
  const limits = PLAN_LIMITS[user.plan as PlanType];
  if (projectCount >= limits.max_projects) {
    throw new Error("Project limit reached for your plan.");
  }
}

export function enforceAnalysisQuota(user: AuthUser) {
  const limits = PLAN_LIMITS[user.plan as PlanType];
  if (user.analyses_used_this_month >= limits.max_analyses_per_month) {
    throw new Error("Monthly analysis quota reached for your plan.");
  }
}

export function allowDifferentiators(user: AuthUser): boolean {
  const limits = PLAN_LIMITS[user.plan as PlanType];
  return limits.allow_differentiators;
}
