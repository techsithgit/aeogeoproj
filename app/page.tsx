import Link from "next/link";
import SignedInStatus from "@/components/SignedInStatus";

export default function Home() {
  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>AEO/GEO Engine</h1>
      <SignedInStatus />
      <p>Sign in to manage projects and run analyses.</p>
      <p>
        <Link href="/login">Sign in</Link>
      </p>
      <p>
        Once signed in, go to <Link href="/projects">Projects</Link> to create a project and run analyses.
      </p>
    </main>
  );
}
