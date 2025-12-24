"use client";

import { useState, FormEvent } from "react";

const plans = ["free", "pro", "agency"] as const;

export default function AdminPlanForm() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<(typeof plans)[number]>("pro");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/set-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update plan");
      return;
    }
    setMessage("Plan updated");
  };

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>Admin: Set user plan</h2>
      <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="email"
          placeholder="user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "0.4rem", minWidth: "260px" }}
        />
        <select value={plan} onChange={(e) => setPlan(e.target.value as (typeof plans)[number])} style={{ padding: "0.4rem" }}>
          {plans.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button type="submit" style={{ padding: "0.4rem 0.8rem" }} disabled={loading}>
          {loading ? "Updating..." : "Update plan"}
        </button>
      </form>
      {message && <p style={{ color: "green", marginTop: "0.5rem" }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
    </section>
  );
}
