"use client";

import { useState } from "react";

export default function AcceptInvite() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    setError(null);
    if (!token) return;
    const res = await fetch(`/api/teams/invite/${token}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setMessage(`Joined team ${data.team_id} as ${data.role}`);
    setToken("");
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <h3>Accept invite</h3>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Paste invite token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ padding: "0.4rem", minWidth: "260px" }}
        />
        <button onClick={submit} style={{ padding: "0.4rem 0.8rem" }}>
          Accept
        </button>
      </div>
      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
