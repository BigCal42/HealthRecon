import { notFound } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemInsights } from "@/lib/getSystemInsights";
import { UICopy } from "@/lib/uiCopy";
import { OPPORTUNITY_STAGE_LABELS } from "@/lib/opportunityStages";

type SystemInsightsPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function SystemInsightsPage({
  params,
}: SystemInsightsPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();
  const insights = await getSystemInsights(supabase, slug, {
    windowDays: 90,
  });

  if (!insights) {
    notFound();
  }

  const { systemId, slug: systemSlug, name, windowDays } = insights;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{UICopy.insights.systemTitlePrefix}{name}</h1>
      <p>Window: last {windowDays} days</p>
      <p>
        <a href={`/systems/${systemSlug}`}>Back to {name}</a>
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Signals & Follow-Through</h2>
        <p>Total: {insights.signals.total}</p>
        <h3>By category</h3>
        <ul>
          {Object.entries(insights.signals.byCategory).map(([cat, count]) => (
            <li key={cat}>
              {cat}: {count}
            </li>
          ))}
        </ul>
        <h3>By severity</h3>
        <ul>
          {Object.entries(insights.signals.bySeverity).map(([sev, count]) => (
            <li key={sev}>
              {sev}: {count}
            </li>
          ))}
        </ul>
        <p>
          Signal actions: {insights.signals.actions.totalSignalActions} (follow-through{" "}
          {insights.signals.actions.followThroughRate === null
            ? "n/a"
            : `${Math.round(insights.signals.actions.followThroughRate * 100)}%`}
          )
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Pipeline & Outcomes</h2>
        <p>Total: {insights.opportunities.total}</p>
        <h3>By stage</h3>
        <ul>
          {Object.entries(insights.opportunities.byStage).map(([stage, count]) => (
            <li key={stage}>
              {OPPORTUNITY_STAGE_LABELS[stage as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? stage}: {count}
            </li>
          ))}
        </ul>
        <p>
          Open pipeline:{" "}
          {insights.opportunities.openPipelineAmount ?? 0}
        </p>
        <p>
          Closed won (last {windowDays}d):{" "}
          {insights.opportunities.closedWonAmountLastWindow ?? 0}
        </p>
        <p>
          Closed lost (last {windowDays}d):{" "}
          {insights.opportunities.closedLostAmountLastWindow ?? 0}
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Work in Motion</h2>
        <p>Open work items: {insights.work.openWorkItems}</p>
        <p>
          Completed work items (last {windowDays}d):{" "}
          {insights.work.completedWorkItemsLastWindow}
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Touchpoints</h2>
        <p>
          Interactions (last {windowDays}d):{" "}
          {insights.interactions.totalLastWindow}
        </p>
        <p>
          Last interaction at:{" "}
          {insights.interactions.lastInteractionAt
            ? new Date(insights.interactions.lastInteractionAt).toLocaleString()
            : "No interactions"}
        </p>
      </section>
    </main>
  );
}

