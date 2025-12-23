"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main style={{ padding: "1.5rem", maxWidth: "480px" }}>
      <h1>Sign in</h1>
      <button
        onClick={() => signIn("google", { callbackUrl: "/projects" })}
        style={{ padding: "0.75rem 1rem", marginTop: "0.5rem" }}
      >
        Continue with Google
      </button>
    </main>
  );
}
