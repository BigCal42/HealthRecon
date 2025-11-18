import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemMetrics } from "@/lib/getSystemMetrics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const metrics = await getSystemMetrics(supabase);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Systems Dashboard</h1>
      <p>
        <Link href="/">Home</Link> | <Link href="/worklist">Worklist</Link> |{" "}
        <Link href="/targets">See prioritized systems</Link> |{" "}
        <Link href="/search">Global Search</Link> |{" "}
        <Link href="/admin/systems">Admin: Manage Systems</Link>
      </p>
      {metrics.length === 0 ? (
        <p>No systems found.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                System
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                Slug
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Documents
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Signals
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Opportunities
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                Last Pipeline Run
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                Last Daily Briefing
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id}>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  <Link href={`/systems/${m.slug}`}>{m.name}</Link>
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>{m.slug}</td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {m.documentCount}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {m.signalCount}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {m.opportunityCount}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {m.lastPipelineRunAt
                    ? new Date(m.lastPipelineRunAt).toLocaleString()
                    : "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {m.lastDailyBriefingAt
                    ? new Date(m.lastDailyBriefingAt).toLocaleString()
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

