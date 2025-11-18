import type { SupabaseClient } from "@supabase/supabase-js";

export interface TimelineEvent {
  type:
    | "signal"
    | "news"
    | "document"
    | "interaction"
    | "opportunity"
    | "profile"
    | "pipeline_run"
    | "daily_briefing";
  title: string;
  description?: string;
  timestamp: string; // ISO
  metadata?: Record<string, any>;
}

type SignalRow = {
  id: string;
  summary: string | null;
  category: string | null;
  severity: string | null;
  created_at: string | null;
};

type NewsRow = {
  id: string;
  title: string | null;
  crawled_at: string | null;
};

type DocumentRow = {
  id: string;
  title: string | null;
  crawled_at: string | null;
};

type InteractionRow = {
  id: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string | null;
};

type OpportunityRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

type SystemProfileRow = {
  id: string;
  summary: {
    executive_summary?: string;
  };
  created_at: string | null;
};

type PipelineRunRow = {
  id: string;
  status: string;
  created_at: string | null;
};

type DailyBriefingRow = {
  id: string;
  created_at: string | null;
};

export async function getSystemTimeline(
  supabase: SupabaseClient,
  systemId: string,
): Promise<TimelineEvent[]> {
  const [
    { data: signalRows },
    { data: newsRows },
    { data: documentRows },
    { data: interactionRows },
    { data: opportunityRows },
    { data: profileRows },
    { data: pipelineRunRows },
    { data: briefingRows },
  ] = await Promise.all([
    supabase
      .from("signals")
      .select("id, summary, category, severity, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .returns<SignalRow[]>(),
    supabase
      .from("documents")
      .select("id, title, crawled_at")
      .eq("system_id", systemId)
      .eq("source_type", "news")
      .order("crawled_at", { ascending: false })
      .returns<NewsRow[]>(),
    supabase
      .from("documents")
      .select("id, title, crawled_at")
      .eq("system_id", systemId)
      .neq("source_type", "news")
      .order("crawled_at", { ascending: false })
      .returns<DocumentRow[]>(),
    supabase
      .from("interactions")
      .select("id, subject, summary, occurred_at")
      .eq("system_id", systemId)
      .order("occurred_at", { ascending: false })
      .returns<InteractionRow[]>(),
    supabase
      .from("opportunities")
      .select("id, title, status, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .returns<OpportunityRow[]>(),
    supabase
      .from("system_profiles")
      .select("id, summary, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .returns<SystemProfileRow[]>(),
    supabase
      .from("pipeline_runs")
      .select("id, status, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .returns<PipelineRunRow[]>(),
    supabase
      .from("daily_briefings")
      .select("id, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .returns<DailyBriefingRow[]>(),
  ]);

  const events: TimelineEvent[] = [];

  // Normalize signals
  (signalRows ?? []).forEach((row) => {
    if (row.created_at) {
      events.push({
        type: "signal",
        title: row.summary ?? "Signal",
        description: `${row.severity ?? "Unknown"} severity - ${row.category ?? "Unknown"} category`,
        timestamp: row.created_at,
        metadata: {
          severity: row.severity,
          category: row.category,
        },
      });
    }
  });

  // Normalize news
  (newsRows ?? []).forEach((row) => {
    if (row.crawled_at) {
      events.push({
        type: "news",
        title: row.title ?? "News article",
        timestamp: row.crawled_at,
      });
    }
  });

  // Normalize documents (non-news)
  (documentRows ?? []).forEach((row) => {
    if (row.crawled_at) {
      events.push({
        type: "document",
        title: row.title ?? "Document",
        timestamp: row.crawled_at,
      });
    }
  });

  // Normalize interactions
  (interactionRows ?? []).forEach((row) => {
    if (row.occurred_at) {
      events.push({
        type: "interaction",
        title: row.subject ?? "Interaction",
        description: row.summary ?? undefined,
        timestamp: row.occurred_at,
      });
    }
  });

  // Normalize opportunities
  (opportunityRows ?? []).forEach((row) => {
    if (row.created_at) {
      events.push({
        type: "opportunity",
        title: row.title ?? "Opportunity",
        description: `Status: ${row.status ?? "Unknown"}`,
        timestamp: row.created_at,
        metadata: {
          status: row.status,
        },
      });
    }
  });

  // Normalize system profile updates
  (profileRows ?? []).forEach((row) => {
    if (row.created_at) {
      const executiveSummary =
        typeof row.summary === "object" && row.summary !== null && "executive_summary" in row.summary
          ? (row.summary as { executive_summary?: string }).executive_summary
          : undefined;
      events.push({
        type: "profile",
        title: "System profile updated",
        description: executiveSummary ?? "System profile generated",
        timestamp: row.created_at,
      });
    }
  });

  // Normalize pipeline runs
  (pipelineRunRows ?? []).forEach((row) => {
    if (row.created_at) {
      events.push({
        type: "pipeline_run",
        title: `Pipeline run - ${row.status}`,
        timestamp: row.created_at,
        metadata: {
          status: row.status,
        },
      });
    }
  });

  // Normalize daily briefings
  (briefingRows ?? []).forEach((row) => {
    if (row.created_at) {
      events.push({
        type: "daily_briefing",
        title: "Daily briefing generated",
        timestamp: row.created_at,
      });
    }
  });

  // Sort descending by timestamp
  events.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  return events;
}

