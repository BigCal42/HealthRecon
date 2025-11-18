import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getWorklist } from "@/lib/getWorklist";

export const dynamic = "force-dynamic";

export default async function WorklistPage() {
  const supabase = createServerSupabaseClient();
  const { overdueInteractions, upcomingInteractions, recentActivity } =
    await getWorklist(supabase);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Worklist</h1>
      <p>Your current follow-ups and recent system activity.</p>
      <p>
        <Link href="/">Home</Link> | <Link href="/dashboard">Dashboard</Link>
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Overdue Next Steps</h2>
        {overdueInteractions.length === 0 ? (
          <p>No overdue next steps. 🎯</p>
        ) : (
          <ul>
            {overdueInteractions.map((item) => (
              <li key={item.id} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>
                    {item.systemName} ({item.channel})
                  </strong>{" "}
                  –{" "}
                  <Link href={`/systems/${item.systemSlug}`}>
                    /systems/{item.systemSlug}
                  </Link>
                </p>
                <p>{item.subject ?? "(No subject)"}</p>
                <p>
                  Next step: {item.nextStep ?? "(none)"} <br />
                  Due: {item.nextStepDueAt ? new Date(item.nextStepDueAt).toLocaleString() : "N/A"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Upcoming Next Steps (Next 7 Days)</h2>
        {upcomingInteractions.length === 0 ? (
          <p>No upcoming next steps.</p>
        ) : (
          <ul>
            {upcomingInteractions.map((item) => (
              <li key={item.id} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>
                    {item.systemName} ({item.channel})
                  </strong>{" "}
                  –{" "}
                  <Link href={`/systems/${item.systemSlug}`}>
                    /systems/{item.systemSlug}
                  </Link>
                </p>
                <p>{item.subject ?? "(No subject)"}</p>
                <p>
                  Next step: {item.nextStep ?? "(none)"} <br />
                  Due: {item.nextStepDueAt ? new Date(item.nextStepDueAt).toLocaleString() : "N/A"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Recently Active Systems (Last 7 Days)</h2>
        {recentActivity.length === 0 ? (
          <p>No recent activity.</p>
        ) : (
          <ul>
            {recentActivity.map((item) => (
              <li key={item.systemId} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>{item.systemName}</strong> –{" "}
                  <Link href={`/systems/${item.systemSlug}`}>
                    /systems/{item.systemSlug}
                  </Link>
                </p>
                <p>
                  Last activity: {new Date(item.lastActivityAt).toLocaleString()} ({item.activityKind})
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

