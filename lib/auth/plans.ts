export type PlanType = "free" | "pro" | "agency";

export const PLAN_LIMITS: Record<
  PlanType,
  {
    max_projects: number;
    max_analyses_per_month: number;
    allow_differentiators: boolean;
    max_teams: number;
    max_members_per_team: number;
    included_seats: number;
  }
> = {
  free: {
    max_projects: 2,
    max_analyses_per_month: 20,
    allow_differentiators: false,
    max_teams: 1,
    max_members_per_team: 2,
    included_seats: 1,
  },
  pro: {
    max_projects: 10,
    max_analyses_per_month: 200,
    allow_differentiators: true,
    max_teams: 1,
    max_members_per_team: 10,
    included_seats: 3,
  },
  agency: {
    max_projects: 50,
    max_analyses_per_month: 1000,
    allow_differentiators: true,
    max_teams: 5,
    max_members_per_team: 50,
    included_seats: 10,
  },
};
