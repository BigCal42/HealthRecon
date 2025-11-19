import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemTargets } from "@/lib/getSystemTargets";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const supabase = createServerSupabaseClient();
  const targets = await getSystemTargets(supabase);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>System Targeting</h1>
      <p>Heuristic priority scores to help decide where to focus.</p>
      <p>
        <Link href="/">Home</Link> | <Link href="/dashboard">Dashboard</Link> |{" "}
        <Link href="/worklist">Worklist</Link>
      </p>
      {targets.length === 0 ? (
        <p>No systems available.</p>
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
              <th style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "left" }}>
                Reasons
              </th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.systemId}>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  <Link href={`/systems/${t.slug}`}>{t.name}</Link>
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>{t.band}</td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem", textAlign: "right" }}>
                  {t.score}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {t.reasons.length === 0 ? (
                    "-"
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                      {t.reasons.map((r, i) => (
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
