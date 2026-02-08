"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import SignedInStatus from "@/components/SignedInStatus";
import TeamMembers from "@/components/TeamMembers";

type AnalysisListItem = {
  id: string;
  status: string;
  created_at: string;
  request: { source: { type: string; value: string } };
};

type Project = {
  id: string;
  name: string;
  team_id?: string;
  team_name?: string;
};

export default function ProjectDetailPage() {
  const { project_id } = useParams<{ project_id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [seatInfo, setSeatInfo] = useState<{ seat_usage: number; seat_limit: number; plan: string; status?: string } | null>(null);
  const [mode, setMode] = useState<"topic" | "url">("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [includeDiff, setIncludeDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string>("");

  const load = async () => {
    const projRes = await fetch(`/api/projects/${project_id}`);
    if (projRes.ok) {
      const data = await projRes.json();
      setProject(data.project);
      if (data.project?.team_id) {
        const teamRes = await fetch(`/api/teams/${data.project.team_id}`);
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setRole(teamData.current_role || "");
          setProject((prev) => (prev ? { ...prev, team_name: teamData.team?.name } : prev));
        }
        const billingRes = await fetch(`/api/billing/status?team_id=${data.project.team_id}`);
        if (billingRes.ok) {
          const bill = await billingRes.json();
          setSeatInfo({ seat_usage: bill.seat_usage, seat_limit: bill.seat_limit, plan: bill.plan, status: bill.subscription_status });
        }
      }
    }
    const res = await fetch(`/api/projects/${project_id}/analyses`);
    if (res.ok) {
      const data = await res.json();
      setAnalyses(data.analyses ?? []);
    }
  };

  useEffect(() => {
    load();
  }, [project_id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const source = mode === "url" ? { type: "url", value: url.trim() } : { type: "topic", value: topic.trim() };
    const res = await fetch("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        project_id,
        include_differentiators: includeDiff,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to run analysis");
      return;
    }
    setTopic("");
    setUrl("");
    load();
  };

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>{project?.name ?? "Project"}</h1>
      {project?.team_id && (
        <p>
          Team: {project.team_name ?? project.team_id} {role ? `(you are ${role})` : ""}{" "}
          {seatInfo ? `— Seats: ${seatInfo.seat_usage}/${seatInfo.seat_limit} (${seatInfo.plan}${seatInfo.status ? `:${seatInfo.status}` : ""})` : ""}
        </p>
      )}
      <SignedInStatus />
      {project?.team_id && <TeamMembers teamId={project.team_id} />}
      <form
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "540px" }}
      >
        <label>
          Source type
          <select value={mode} onChange={(e) => setMode(e.target.value as "topic" | "url")} style={{ padding: "0.4rem", marginTop: "0.25rem" }}>
            <option value="topic">Topic</option>
            <option value="url">URL</option>
          </select>
        </label>
        <label>
          {mode === "url" ? "URL" : "Topic"}
          <input
            value={mode === "url" ? url : topic}
            onChange={(e) => (mode === "url" ? setUrl(e.target.value) : setTopic(e.target.value))}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" checked={includeDiff} onChange={(e) => setIncludeDiff(e.target.checked)} />
          Include differentiators (if plan allows)
        </label>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ padding: "0.6rem 1rem" }} disabled={role === "viewer"}>
          {loading ? "Running..." : role === "viewer" ? "View only" : "Run analysis"}
        </button>
      </form>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Analyses</h2>
        {analyses.length === 0 ? (
          <p>No analyses yet.</p>
        ) : (
          <ul>
            {analyses.map((a) => (
              <li key={a.id} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <a href={`/api/analyses/${a.id}`} target="_blank" rel="noreferrer">
                    {a.request.source.type}: {a.request.source.value} ({a.status})
                  </a>
                  <button
                    disabled={role === "viewer"}
                    onClick={async () => {
                      await fetch(`/api/analyses/${a.id}`, { method: "DELETE" });
                      load();
                    }}
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    Delete
                  </button>
                  <button
                    disabled={role === "viewer"}
                    onClick={async () => {
                      const res = await fetch(`/api/analyses/${a.id}/export`, { method: "POST" });
                      const data = await res.json();
                      if (!res.ok) {
                        alert(data.error || "Export failed");
                        return;
                      }
                      window.open(data.download_url, "_blank");
                    }}
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    Export PDF
                  </button>
                  <button
                    disabled={role === "viewer"}
                    onClick={async () => {
                      const res = await fetch(`/api/analyses/${a.id}/share`, { method: "POST" });
                      const data = await res.json();
                      if (!res.ok) {
                        alert(data.error || "Unable to create share link");
                        return;
                      }
                      setShareLinks((prev) => ({ ...prev, [a.id]: data.share_url }));
                    }}
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    Share link
                  </button>
                  <button
                    disabled={role === "viewer"}
                    onClick={async () => {
                      await fetch(`/api/analyses/${a.id}/share`, { method: "DELETE" });
                      setShareLinks((prev) => {
                        const next = { ...prev };
                        delete next[a.id];
                        return next;
                      });
                    }}
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    Revoke share
                  </button>
                </div>
                {shareLinks[a.id] && (
                  <div style={{ fontSize: "0.9rem" }}>
                    Share URL:{" "}
                    <a href={shareLinks[a.id]} target="_blank" rel="noreferrer">
                      {shareLinks[a.id]}
                    </a>
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const formData = new FormData(target);
                    const feedback = formData.get("feedback") as string;
                    const helpful_part = formData.get("helpful_part") as string;
                    await fetch(`/api/analyses/${a.id}/feedback`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        feedback,
                        helpful_part: helpful_part || undefined,
                      }),
                    });
                    target.reset();
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <label>
                    <select name="feedback" required defaultValue="">
                      <option value="" disabled>
                        Feedback
                      </option>
                      <option value="up">👍 Helpful</option>
                      <option value="down">👎 Not helpful</option>
                    </select>
                  </label>
                  <label>
                    <select name="helpful_part" defaultValue="">
                      <option value="">Most helpful part (optional)</option>
                      <option value="prompts">Prompts</option>
                      <option value="why_not_answer">Why not answer</option>
                      <option value="fixes">Fixes</option>
                      <option value="differentiators">Differentiators</option>
                      <option value="scoring">Scoring</option>
                    </select>
                  </label>
                  <button type="submit" style={{ padding: "0.3rem 0.6rem" }}>
                    Submit
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
