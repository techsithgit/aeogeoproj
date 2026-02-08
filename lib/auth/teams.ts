import { sql } from "@vercel/postgres";
import { PLAN_LIMITS, PlanType } from "./plans";
import { AuthUser } from "./session";

export type TeamRole = "owner" | "member" | "viewer";

export type TeamMembership = {
  team_id: string;
  user_id: string;
  role: TeamRole;
  name?: string;
};

const ROLE_ORDER: TeamRole[] = ["viewer", "member", "owner"];

export async function listMemberships(userId: string): Promise<TeamMembership[]> {
  const { rows } = await sql<{ team_id: string; user_id: string; role: TeamRole; name: string }>`
    SELECT tm.team_id, tm.user_id, tm.role, t.name
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = ${userId}
    ORDER BY t.created_at ASC;
  `;
  return rows as TeamMembership[];
}

export function hasRole(membership: TeamMembership | undefined, minRole: TeamRole): boolean {
  if (!membership) return false;
  return ROLE_ORDER.indexOf(membership.role) >= ROLE_ORDER.indexOf(minRole);
}

export async function ensureTeamAccess(userId: string, teamId: string, minRole: TeamRole): Promise<TeamMembership> {
  const { rows } = await sql<{ team_id: string; user_id: string; role: TeamRole; name: string }>`
    SELECT tm.team_id, tm.user_id, tm.role, t.name
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = ${userId} AND tm.team_id = ${teamId}
    LIMIT 1;
  `;
  const membership = rows[0] as TeamMembership | undefined;
  if (!membership || !hasRole(membership, minRole)) {
    throw new Error("Unauthorized");
  }
  return membership;
}

export async function enforceTeamLimits(user: AuthUser) {
  const limits = PLAN_LIMITS[user.plan];
  const teamCountRes = await sql`SELECT COUNT(*)::int AS count FROM team_memberships WHERE user_id = ${user.id};`;
  if (teamCountRes.rows[0].count >= limits.max_teams) {
    throw new Error("Team limit exceeded for plan");
  }
}

export async function enforceMemberLimit(teamId: string, plan: PlanType) {
  const limits = PLAN_LIMITS[plan];
  const { rows } = await sql`
    SELECT COUNT(*)::int AS count
    FROM team_memberships
    WHERE team_id = ${teamId} AND role IN ('owner','member');
  `;
  if (rows[0].count >= limits.max_members_per_team) {
    throw new Error("Member limit exceeded for plan");
  }
}

export async function getDefaultTeamId(userId: string): Promise<string | null> {
  const { rows } = await sql`
    SELECT tm.team_id
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = ${userId}
    ORDER BY t.created_at ASC
    LIMIT 1;
  `;
  return rows[0]?.team_id ?? null;
}

export async function getTeamPlan(teamId: string): Promise<PlanType | null> {
  const { rows } = await sql`
    SELECT plan
    FROM teams
    WHERE id = ${teamId}
    LIMIT 1;
  `;
  return rows[0]?.plan ?? null;
}

export async function getTeamBilling(teamId: string): Promise<{
  plan: PlanType;
  included_seats: number;
  purchased_seats: number;
  subscription_status?: string | null;
  seat_limit: number;
  seat_usage: number;
}> {
  const teamRes = await sql`
    SELECT plan, included_seats, purchased_seats, subscription_status
    FROM teams
    WHERE id = ${teamId}
    LIMIT 1;
  `;
  const team = teamRes.rows[0];
  const plan = (team?.plan as PlanType) ?? "free";
  const included_seats = team?.included_seats ?? PLAN_LIMITS[plan].included_seats;
  const purchased_seats = team?.purchased_seats ?? 0;
  const seat_limit = included_seats + purchased_seats;
  const usageRes = await sql`
    SELECT COUNT(*)::int AS count
    FROM team_memberships
    WHERE team_id = ${teamId} AND role IN ('owner','member');
  `;
  const seat_usage = usageRes.rows[0]?.count ?? 0;
  return {
    plan,
    included_seats,
    purchased_seats,
    subscription_status: team?.subscription_status ?? null,
    seat_limit,
    seat_usage,
  };
}
