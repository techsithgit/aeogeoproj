"use client";

import { useSession, signOut } from "next-auth/react";

export default function SignedInStatus() {
  const { data, status } = useSession();

  if (status === "loading") return null;
  if (status === "unauthenticated") return <p>Not signed in.</p>;

  return (
    <div style={{ margin: "0.5rem 0" }}>
      <p>
        Signed in as {data?.user?.email} {data?.user?.plan ? `(plan: ${data.user.plan})` : ""}
      </p>
      <button onClick={() => signOut({ callbackUrl: "/" })} style={{ padding: "0.4rem 0.8rem" }}>
        Sign out
      </button>
    </div>
  );
}
