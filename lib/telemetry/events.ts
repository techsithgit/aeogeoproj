import { sql } from "@vercel/postgres";
import crypto from "crypto";
import type { PlanType } from "@/lib/auth/plans";

export type EventName =
  | "project_created"
  | "analysis_created"
  | "analysis_completed"
  | "analysis_failed"
  | "analysis_viewed"
  | "analysis_revisited"
  | "differentiators_requested"
  | "differentiators_blocked_by_plan"
  | "quota_exceeded"
  | "export_requested"
  | "export_generated"
  | "export_downloaded"
  | "share_link_created"
  | "share_link_revoked"
  | "share_link_viewed"
  | "feedback_submitted";

export type EventProps = {
  source_type?: "topic" | "url";
  extraction_status?: "success" | "partial" | "failed";
  include_differentiators?: boolean;
  analysis_status?: string;
  error_code?: string;
  latency_bucket?: "<2s" | "2-5s" | "5-10s" | ">10s";
  hostname?: string;
  helpful_part?: "prompts" | "why_not_answer" | "fixes" | "differentiators" | "scoring";
  feedback?: "up" | "down";
  export_type?: "pdf";
  differentiators_included?: boolean;
};

type RecordEventArgs = {
  event_name: EventName;
  user_id: string;
  plan: PlanType;
  project_id?: string;
  analysis_id?: string;
  properties?: EventProps;
};

export async function recordEvent({
  event_name,
  user_id,
  plan,
  project_id,
  analysis_id,
  properties = {},
}: RecordEventArgs) {
  const event_id = crypto.randomUUID();
  await sql`
    INSERT INTO events (id, event_name, user_id, project_id, analysis_id, plan, created_at, properties)
    VALUES (${event_id}, ${event_name}, ${user_id}, ${project_id ?? null}, ${analysis_id ?? null}, ${plan}, NOW(), ${sql.json(properties)})
  `;
}

export function getHostname(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return undefined;
  }
}

export function latencyBucket(ms: number): "<2s" | "2-5s" | "5-10s" | ">10s" {
  if (ms < 2000) return "<2s";
  if (ms < 5000) return "2-5s";
  if (ms < 10000) return "5-10s";
  return ">10s";
}
