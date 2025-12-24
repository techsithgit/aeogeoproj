"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import SignedInStatus from "@/components/SignedInStatus";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/projects",
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials");
    } else if (res?.ok) {
      window.location.href = "/projects";
    }
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "480px" }}>
      <h1>Sign in</h1>
      <SignedInStatus />
      <section style={{ marginTop: "0.75rem" }}>
        <h2>With Google</h2>
        <button
          onClick={() => signIn("google", { callbackUrl: "/projects" })}
          style={{ padding: "0.75rem 1rem", marginTop: "0.5rem" }}
        >
          Continue with Google
        </button>
      </section>
      <section style={{ marginTop: "1rem" }}>
        <h2>With Email</h2>
        <form onSubmit={handleCredentials} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" style={{ padding: "0.6rem 1rem" }}>
            {loading ? "Signing in..." : "Sign in / Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
