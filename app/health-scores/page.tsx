import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemHealthScores } from "@/lib/getSystemHealthScore";

export const dynamic = "force-dynamic";

export default async function HealthScoresPage() {
  const supabase = createServerSupabaseClient();
  const scores = await getSystemHealthScores(supabase);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>System Health Scores</h1>
      <p>Composite, explainable account health metrics per system.</p>
      {scores.length === 0 ? (
        <p>No systems found.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "1rem" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                System
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                Band
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Score
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Engagement
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Opportunities
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Signals
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                Risk
              </th>
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                Reasons
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.systemId}>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  <Link href={`/systems/${s.slug}`}>{s.name}</Link>
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>{s.band}</td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {s.overallScore}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {s.components.engagementScore}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {s.components.opportunityScore}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {s.components.signalScore}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {s.components.riskScore}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {s.reasons.length === 0 ? (
                    "-"
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                      {s.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

