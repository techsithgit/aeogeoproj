"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";

type AnalysisListItem = {
  id: string;
  status: string;
  created_at: string;
  request: { source: { type: string; value: string } };
};

type Project = {
  id: string;
  name: string;
};

export default function ProjectDetailPage() {
  const { project_id } = useParams<{ project_id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [mode, setMode] = useState<"topic" | "url">("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [includeDiff, setIncludeDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const projRes = await fetch(`/api/projects/${project_id}`);
    if (projRes.ok) {
      const data = await projRes.json();
      setProject(data.project);
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
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "540px" }}>
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
        <button type="submit" style={{ padding: "0.6rem 1rem" }}>{loading ? "Running..." : "Run analysis"}</button>
      </form>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Analyses</h2>
        {analyses.length === 0 ? (
          <p>No analyses yet.</p>
        ) : (
          <ul>
            {analyses.map((a) => (
              <li key={a.id}>
                <a href={`/api/analyses/${a.id}`} target="_blank" rel="noreferrer">
                  {a.request.source.type}: {a.request.source.value} ({a.status})
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
