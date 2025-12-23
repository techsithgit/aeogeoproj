export type PlanType = "free" | "pro" | "agency";

export const PLAN_LIMITS: Record<
  PlanType,
  {
    max_projects: number;
    max_analyses_per_month: number;
    allow_differentiators: boolean;
  }
> = {
  free: {
    max_projects: 2,
    max_analyses_per_month: 20,
    allow_differentiators: false,
  },
  pro: {
    max_projects: 10,
    max_analyses_per_month: 200,
    allow_differentiators: true,
  },
  agency: {
    max_projects: 50,
    max_analyses_per_month: 1000,
    allow_differentiators: true,
  },
};
