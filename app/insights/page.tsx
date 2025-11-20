import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getGlobalInsights } from "@/lib/getGlobalInsights";
import { UICopy } from "@/lib/uiCopy";

export const dynamic = "force-dynamic";

export default async function GlobalInsightsPage() {
  const supabase = createServerSupabaseClient();
  const insights = await getGlobalInsights(supabase, { windowDays: 90 });

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{UICopy.insights.globalTitle}</h1>
      <p>
        <Link href="/strategy/global">Global Strategy Dashboard</Link>
      </p>
      <p>Window: last {insights.windowDays} days</p>
      <p>Tracked systems: {insights.systemCount}</p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Pipeline (All Systems)</h2>
        <p>Open pipeline: {insights.totals.openPipelineAmount ?? 0}</p>
        <p>
          Closed won (last {insights.windowDays}d):{" "}
          {insights.totals.closedWonAmountLastWindow ?? 0}
        </p>
        <p>
          Closed lost (last {insights.windowDays}d):{" "}
          {insights.totals.closedLostAmountLastWindow ?? 0}
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Activity (Last {insights.windowDays} Days)</h2>
        <p>Signals: {insights.totals.signalsLastWindow}</p>
        <p>Signal actions: {insights.totals.signalActionsLastWindow}</p>
        <p>Interactions: {insights.totals.interactionsLastWindow}</p>
        <p>Work items created: {insights.totals.workItemsCreatedLastWindow}</p>
        <p>Work items done: {insights.totals.workItemsDoneLastWindow}</p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Top Systems by Open Pipeline</h2>
        {insights.topByPipeline.length === 0 ? (
          <p>No data.</p>
        ) : (
          <ul>
            {insights.topByPipeline.map((s) => (
              <li key={s.systemId}>
                <Link href={`/systems/${s.slug}/insights`}>{s.name}</Link> –{" "}
                {s.openPipelineAmount ?? 0}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Top Systems by Closed Won</h2>
        {insights.topByClosedWon.length === 0 ? (
          <p>No data.</p>
        ) : (
          <ul>
            {insights.topByClosedWon.map((s) => (
              <li key={s.systemId}>
                <Link href={`/systems/${s.slug}/insights`}>{s.name}</Link> –{" "}
                {s.closedWonAmountLastWindow ?? 0}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Top Systems by Signal Volume</h2>
        {insights.topBySignals.length === 0 ? (
          <p>No data.</p>
        ) : (
          <ul>
            {insights.topBySignals.map((s) => (
              <li key={s.systemId}>
                <Link href={`/systems/${s.slug}/insights`}>{s.name}</Link> –{" "}
                {s.signalCountLastWindow}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

