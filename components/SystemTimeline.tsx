import Link from "next/link";
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
    return <p className="text-sm text-muted-foreground">No timeline items yet.</p>;
  }

  return (
    <>
      <ul className="space-y-2 divide-y divide-border/20">
        {timeline.items.map((item) => (
          <li key={`${item.type}-${item.id}-${item.occurredAt}`} className="pt-2 first:pt-0 first:border-0">
            <p className="text-sm">
              <span className="text-xs text-muted-foreground font-medium">[{item.type}]</span>{" "}
              <span className="text-xs text-muted-foreground">{item.occurredAt}</span>{" "}
              <span className="text-sm">{item.title}</span>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <Link
          href={`/systems/${timeline.slug}/timeline`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
        >
          View full timeline →
        </Link>
      </p>
    </>
  );
}

