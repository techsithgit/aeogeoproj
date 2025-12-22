"use client";

import { FormEvent, useState } from "react";

type AnalysisResponse = {
  analysis_id?: string;
  status?: string;
  analysis?: unknown;
  error?: string;
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const context: Record<string, string> = {};
    if (location.trim()) context.location = location.trim();
    if (industry.trim()) context.industry = industry.trim();

    const response = await fetch("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        context,
      }),
    });

    const created = (await response.json()) as AnalysisResponse;
    if (created.analysis) {
      setResult(created);
    } else if (created.analysis_id) {
      const detailResponse = await fetch(`/api/analyses/${created.analysis_id}`);
      const detail = (await detailResponse.json()) as AnalysisResponse;
      setResult(detail);
    } else {
      setResult(created);
    }
    setLoading(false);
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "720px" }}>
      <h1>AEO + GEO analysis kernel</h1>
      <p>Enter a topic to run the v1 heuristics engine. UI is intentionally minimal.</p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label>
          Topic
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Location (optional)
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Industry (optional)
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <button type="submit" style={{ padding: "0.6rem 1rem" }}>
          {loading ? "Running..." : "Run analysis"}
        </button>
      </form>

      {result && (
        <section style={{ marginTop: "1rem" }}>
          <h2>Response</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "1rem" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
