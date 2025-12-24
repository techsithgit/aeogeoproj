"use client";

import { useEffect, useState, FormEvent } from "react";
import SignedInStatus from "@/components/SignedInStatus";
import TeamMembers from "@/components/TeamMembers";
import AcceptInvite from "@/components/AcceptInvite";

type Project = {
  id: string;
  name: string;
  primary_domain?: string;
  industry?: string;
  created_at: string;
  team_id?: string;
};

type Team = { id: string; name: string; role: string };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [name, setName] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const teamsRes = await fetch("/api/teams");
    if (teamsRes.ok) {
      const data = await teamsRes.json();
      setTeams(data.teams ?? []);
      if (!selectedTeam && data.teams?.length) {
        setSelectedTeam(data.teams[0].id);
      }
    }
    const res = await fetch("/api/projects");
    if (!res.ok) {
      setError("Unable to load projects. Make sure you are signed in.");
      return;
    }
    const data = await res.json();
    setProjects(data.projects ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        primary_domain: primaryDomain || undefined,
        industry: industry || undefined,
        team_id: selectedTeam || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create project");
      return;
    }
    setName("");
    setPrimaryDomain("");
    setIndustry("");
    load();
  };

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Projects</h1>
      <SignedInStatus />
      {teams.length > 1 && (
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
      )}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "420px" }}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Primary domain (optional)
          <input
            value={primaryDomain}
            onChange={(e) => setPrimaryDomain(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Industry (optional)
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ padding: "0.6rem 1rem" }}>Create project</button>
      </form>

      <section style={{ marginTop: "1.5rem" }}>
        {teams.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <h3>Team members ({teams.find((t) => t.id === selectedTeam)?.name || "Team"})</h3>
            <TeamMembers teamId={selectedTeam || teams[0]?.id} />
            <AcceptInvite />
          </div>
        )}
        {projects.length === 0 ? (
          <p>No projects yet.</p>
        ) : (
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <a href={`/projects/${p.id}`}>{p.name}</a> {p.industry ? `- ${p.industry}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
