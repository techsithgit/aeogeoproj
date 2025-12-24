import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import { recordEvent } from "@/lib/telemetry/events";
import { getHostname } from "@/lib/telemetry/events";
import { Analysis } from "@/lib/analysis/types";
import type { PlanType } from "@/lib/auth/plans";

type ShareRecord = {
  analysis: Analysis;
  project_id: string | null;
  user_id: string;
  token: string;
  plan: PlanType;
  source_type: string;
  source_value: string;
  include_differentiators?: boolean;
  extraction_status?: "success" | "partial" | "failed" | null;
};

export default async function SharePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const { rows } = await sql<ShareRecord>`
    SELECT
      a.analysis,
      a.project_id,
      sl.user_id,
      sl.token,
      u.plan,
      (a.request->'source'->>'type') as source_type,
      (a.request->'source'->>'value') as source_value,
      (a.request->>'include_differentiators')::boolean as include_differentiators,
      (a.analysis->'extraction'->>'status') as extraction_status
    FROM share_links sl
    JOIN analyses a ON a.id = sl.analysis_id
    JOIN users u ON u.id = sl.user_id
    WHERE sl.token = ${token} AND sl.enabled = true
    LIMIT 1;
  `;
  if (!rows.length) return notFound();
  const rec = rows[0];
  const analysis = rec.analysis;
  const allowDiff = rec.plan !== "free" && rec.include_differentiators;
  const blockingReasons = analysis?.diagnosis?.blocking_reasons ?? [];
  const recommendedFixes = analysis?.fixes?.recommended_fixes ?? [];

  // Fire-and-forget telemetry
  recordEvent({
    event_name: "share_link_viewed",
    user_id: rec.user_id,
    plan: rec.plan,
    project_id: rec.project_id ?? undefined,
    analysis_id: analysis?.id,
    properties: {
      source_type: rec.source_type === "url" ? "url" : "topic",
      extraction_status: rec.extraction_status ?? undefined,
      include_differentiators: allowDiff,
      hostname: rec.source_type === "url" ? getHostname(rec.source_value) : undefined,
    },
  }).catch(() => {});

  return (
    <main style={{ padding: "1.5rem", maxWidth: "900px" }}>
      <h1>Analysis</h1>
      <section>
        <h2>Context</h2>
        <p>
          Source ({rec.source_type}): {rec.source_value}
        </p>
      </section>
      <section>
        <h2>Why you’re not the answer</h2>
        {blockingReasons.length === 0 ? (
          <p>No diagnosis available.</p>
        ) : (
          <ul>
            {blockingReasons.map((r) => (
              <li key={r.id}>
                <strong>{r.title}</strong>: {r.detail}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>Recommended fixes</h2>
        {recommendedFixes.length === 0 ? (
          <p>No fixes available.</p>
        ) : (
          <ul>
            {recommendedFixes.map((f) => (
              <li key={f.id}>
                <strong>{f.description}</strong> — {f.why_it_matters}
              </li>
            ))}
          </ul>
        )}
      </section>
      {allowDiff && analysis?.differentiators && (
        <section>
          <h2>Differentiators</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "1rem" }}>
            {JSON.stringify(analysis.differentiators, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
