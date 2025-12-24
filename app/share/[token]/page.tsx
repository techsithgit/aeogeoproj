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

type Params = Promise<{ token: string }>;

export default async function SharePage({ params }: { params: Params }) {
  const { token } = await params;
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
  const diff = analysis?.differentiators;

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
      {allowDiff && diff && (
        <section>
          <h2>Differentiators</h2>
          {diff.answer_fragility && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Answer fragility:</strong> {diff.answer_fragility.status} (score {diff.answer_fragility.fragility_score})
              {diff.answer_fragility.drivers?.length ? (
                <ul>
                  {diff.answer_fragility.drivers.slice(0, 3).map((d) => (
                    <li key={`${d.driver_type}-${d.explanation.slice(0, 24)}`}>{d.driver_type}: {d.explanation}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {diff.citation_profile && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Citation type:</strong> {diff.citation_profile.current_type} ({diff.citation_profile.confidence_level} confidence)
              {diff.citation_profile.requirements_to_upgrade?.length ? (
                <div>
                  Upgrade path: {diff.citation_profile.requirements_to_upgrade[0].target_type} — missing {diff.citation_profile.requirements_to_upgrade[0].missing_signals.join(", ")}
                </div>
              ) : null}
            </div>
          )}

          {diff.first_party_signals && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>First-party signals:</strong> {diff.first_party_signals.presence}
              {diff.first_party_signals.detected_types?.length ? (
                <div>Detected: {diff.first_party_signals.detected_types.join(", ")}</div>
              ) : null}
              {diff.first_party_signals.gaps?.length ? <div>Gaps: {diff.first_party_signals.gaps.join(", ")}</div> : null}
            </div>
          )}

          {diff.geo_sensitivity && (
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Geo sensitivity:</strong> {diff.geo_sensitivity.level} — {diff.geo_sensitivity.explanation}. Implications: {diff.geo_sensitivity.implications}
            </div>
          )}

          {diff.fix_priority?.ordered_fixes?.length ? (
            <div>
              <strong>Fix priority:</strong>
              <ul>
                {diff.fix_priority.ordered_fixes.slice(0, 5).map((f) => (
                  <li key={`${f.fix_id}-${f.priority}`}>{f.priority.toUpperCase()}: fix {f.fix_id} ({f.rationale})</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
