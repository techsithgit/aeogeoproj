import { sql } from "@vercel/postgres";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
import AdminPlanForm from "@/components/AdminPlanForm";

type SummaryRow = { event_name: string; count: number };

async function getCounts(days: number) {
  const { rows } = await sql<SummaryRow>`
    SELECT event_name, COUNT(*)::int AS count
    FROM events
    WHERE created_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY event_name
    ORDER BY event_name;
  `;
  return rows;
}

async function getFunnel(days: number) {
  return sql`
    SELECT event_name, COUNT(*)::int AS count
    FROM events
    WHERE event_name IN ('analysis_created','analysis_completed','analysis_viewed','analysis_revisited')
    AND created_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY event_name
    ORDER BY event_name;
  `;
}

async function getDiffIntent(days: number) {
  return sql`
    SELECT event_name, COUNT(*)::int AS count
    FROM events
    WHERE event_name IN ('differentiators_requested','differentiators_blocked_by_plan')
    AND created_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY event_name;
  `;
}

async function getQuotaFriction(days: number) {
  return sql`
    SELECT plan, COUNT(*)::int AS count
    FROM events
    WHERE event_name = 'quota_exceeded'
    AND created_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY plan;
  `;
}

async function getShareStats(days: number) {
  return sql`
    SELECT event_name, COUNT(*)::int AS count
    FROM events
    WHERE event_name IN ('share_link_created','share_link_revoked','share_link_viewed')
    AND created_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY event_name;
  `;
}

async function getExportStats(days: number) {
  return sql`
    SELECT event_name, COUNT(*)::int AS count
    FROM events
    WHERE event_name IN ('export_requested','export_generated','export_downloaded')
    AND created_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY event_name;
  `;
}

export default async function AdminPage({ searchParams }: { searchParams: { days?: string } }) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!session?.user?.email || session.user.email.toLowerCase() !== adminEmail) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <h1>Admin</h1>
        <p>Unauthorized.</p>
      </main>
    );
  }

  const days = Number(searchParams.days ?? "30") || 30;
  const counts = await getCounts(days);
  const funnel = await getFunnel(days);
  const diffIntent = await getDiffIntent(days);
  const quotaFriction = await getQuotaFriction(days);
  const shareStats = await getShareStats(days);
  const exportStats = await getExportStats(days);

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Admin telemetry</h1>
      <form method="get" style={{ marginBottom: "1rem" }}>
        <label>
          Timeframe (days):
          <input type="number" name="days" min="1" max="90" defaultValue={days} style={{ marginLeft: "0.5rem", width: "4rem" }} />
        </label>
        <button type="submit" style={{ marginLeft: "0.5rem", padding: "0.3rem 0.6rem" }}>
          Apply
        </button>
      </form>

      <section>
        <h2>Events (last {days} days)</h2>
        <ul>
          {counts.map((row) => (
            <li key={row.event_name}>
              {row.event_name}: {row.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Funnel (last {days} days)</h2>
        <ul>
          {funnel.rows.map((row) => (
            <li key={row.event_name}>
              {row.event_name}: {row.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Differentiators intent (last {days} days)</h2>
        <ul>
          {diffIntent.rows.map((row) => (
            <li key={row.event_name}>
              {row.event_name}: {row.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Quota friction (last {days} days)</h2>
        <ul>
          {quotaFriction.rows.map((row) => (
            <li key={row.plan}>
              {row.plan}: {row.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Sharing (last {days} days)</h2>
        <ul>
          {shareStats.rows.map((row) => (
            <li key={row.event_name}>
              {row.event_name}: {row.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Exports (last {days} days)</h2>
        <ul>
          {exportStats.rows.map((row) => (
            <li key={row.event_name}>
              {row.event_name}: {row.count}
            </li>
          ))}
        </ul>
      </section>
      <AdminPlanForm />
    </main>
  );
}
