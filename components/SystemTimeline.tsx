import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemTimeline } from "@/lib/getSystemTimeline";

interface SystemTimelineProps {
  systemId: string;
}

export async function SystemTimeline({ systemId }: SystemTimelineProps) {
  const supabase = createServerSupabaseClient();
  const events = await getSystemTimeline(supabase, systemId);

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2>Timeline</h2>
      {events.length === 0 ? (
        <p>No activity yet.</p>
      ) : (
        <ul>
          {events.map((e, i) => (
            <li key={i}>
              <p>
                <strong>{e.type}</strong> — {e.title}
              </p>
              {e.description && <p>{e.description}</p>}
              <p>{e.timestamp}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

