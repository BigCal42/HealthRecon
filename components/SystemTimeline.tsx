import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemTimeline } from "@/lib/getSystemTimeline";

interface SystemTimelineProps {
  systemSlug: string;
}

export async function SystemTimeline({ systemSlug }: SystemTimelineProps) {
  const supabase = createServerSupabaseClient();
  const timeline = await getSystemTimeline(supabase, systemSlug, {
    daysBack: 30,
    limit: 50,
  });

  if (!timeline || timeline.items.length === 0) {
    return null;
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2>Recent Timeline</h2>
      <ul>
        {timeline.items.map((item) => (
          <li key={`${item.type}-${item.id}-${item.occurredAt}`}>
            <p>
              <strong>[{item.type}]</strong> {item.occurredAt} – {item.title}
            </p>
          </li>
        ))}
      </ul>
      <p>
        <a href={`/systems/${timeline.slug}/timeline`}>View full timeline</a>
      </p>
    </section>
  );
}

