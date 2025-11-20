import { notFound } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemTimeline } from "@/lib/getSystemTimeline";
import { UICopy, ITEM_TYPE_LABELS } from "@/lib/uiCopy";

type TimelinePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function SystemTimelinePage({ params }: TimelinePageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const timeline = await getSystemTimeline(supabase, slug, {
    daysBack: 90,
    limit: 200,
  });

  if (!timeline) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem" }}>
      <p>
        <a href={`/systems/${timeline.slug}`}>← Back to {timeline.name}</a>
      </p>
      <h1>{UICopy.systemSections.timeline} – {timeline.name}</h1>
      <p>The chronological story of signals, interactions, work, and deals for this account.</p>
      {timeline.items.length === 0 ? (
        <p>No timeline items found for this period.</p>
      ) : (
        <ul>
          {timeline.items.map((item) => (
            <li key={`${item.type}-${item.id}-${item.occurredAt}`} style={{ marginBottom: "1rem" }}>
              <p>
                <strong>[{ITEM_TYPE_LABELS[item.type] ?? item.type}]</strong> {item.occurredAt}
              </p>
              <p>{item.title}</p>
              {item.description && <p>{item.description}</p>}
              {item.meta && (
                <details>
                  <summary>Details</summary>
                  <pre>{JSON.stringify(item.meta, null, 2)}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

