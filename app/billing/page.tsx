"use client";

import { useEffect, useState } from "react";

type Team = { id: string; name: string; role: string };
type BillingStatus = {
  plan: string;
  seat_usage: number;
  seat_limit: number;
  subscription_status: string;
};

export default function BillingPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const t = await fetch("/api/teams");
    if (t.ok) {
      const data = await t.json();
      setTeams(data.teams ?? []);
      if (!selectedTeam && data.teams?.length) setSelectedTeam(data.teams[0].id);
    }
  };

  const loadStatus = async (teamId: string) => {
    if (!teamId) return;
    const res = await fetch(`/api/billing/status?team_id=${teamId}`);
    if (!res.ok) {
      setError("Unable to load billing status");
      return;
    }
    const data = await res.json();
    setStatus(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadStatus(selectedTeam);
    }
  }, [selectedTeam]);

  const startCheckout = async (target_plan: "pro" | "agency") => {
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: selectedTeam, target_plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Checkout failed");
      return;
    }
    if (data.url) window.location.href = data.url;
  };

  const openPortal = async () => {
    setError(null);
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: selectedTeam }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Portal failed");
      return;
    }
    if (data.url) window.location.href = data.url;
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "720px" }}>
      <h1>Billing</h1>
      <div style={{ margin: "0.75rem 0" }}>
        <label>
          Team:
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{ marginLeft: "0.5rem", padding: "0.3rem" }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.role})
              </option>
            ))}
          </select>
        </label>
      </div>

      {status ? (
        <div style={{ marginBottom: "1rem" }}>
          <p>
            Plan: <strong>{status.plan}</strong> (status: {status.subscription_status})
          </p>
          <p>
            Seats: {status.seat_usage}/{status.seat_limit}
          </p>
        </div>
      ) : (
        <p>Loading billing status...</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <button onClick={() => startCheckout("pro")} style={{ padding: "0.5rem 0.8rem" }}>
          Upgrade to Pro
        </button>
        <button onClick={() => startCheckout("agency")} style={{ padding: "0.5rem 0.8rem" }}>
          Upgrade to Agency
        </button>
        <button onClick={openPortal} style={{ padding: "0.5rem 0.8rem" }}>
          Manage subscription
        </button>
      </div>

      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <p style={{ marginTop: "1rem" }}>
        Note: only team owners can manage billing. Checkout uses Stripe; portal lets you update payment method or cancel.
      </p>
    </main>
  );
}
