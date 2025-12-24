"use client";

import { useEffect, useState } from "react";

type Member = { user_id: string; email: string; role: string };

export default function TeamMembers({ teamId }: { teamId?: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) {
        setError("Unable to load team");
        return;
      }
      const data = await res.json();
      setMembers(data.members ?? []);
      setCurrentRole(data.current_role ?? "");
    })();
  }, [teamId]);

  const invite = async () => {
    if (!teamId) return;
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/teams/${teamId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setInfo(`Invite created. Token: ${data.invite_token}`);
    setEmail("");
  };

  return (
    <div style={{ padding: "0.5rem 0" }}>
      <ul>
        {members.map((m) => (
          <li key={m.user_id}>
            {m.email} — {m.role}
          </li>
        ))}
      </ul>
      {currentRole === "owner" && (
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="email"
            placeholder="Invite email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "0.4rem", minWidth: "220px" }}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as "member" | "viewer")} style={{ padding: "0.4rem" }}>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onClick={invite} style={{ padding: "0.4rem 0.8rem" }}>
            Send invite
          </button>
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {info && <p style={{ color: "green" }}>{info}</p>}
    </div>
  );
}
