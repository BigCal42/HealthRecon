import type { SupabaseClient } from "@supabase/supabase-js";

export interface SalesBriefingContext {
  forDate: string; // "YYYY-MM-DD"
  systems: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  signals: Array<{
    id: string;
    system_id: string;
    category: string;
    severity: string;
    summary: string;
    created_at: string;
  }>;
  news: Array<{
    id: string;
    system_id: string;
    title: string | null;
    source_type: string;
    crawled_at: string;
  }>;
  opportunities: Array<{
    id: string;
    system_id: string;
    title: string;
    status: string;
    created_at: string;
  }>;
  interactions: Array<{
    id: string;
    system_id: string;
    channel: string;
    subject: string | null;
    summary: string | null;
    occurred_at: string;
  }>;
  signalActions: Array<{
    id: string;
    system_id: string;
    signal_id: string;
    action_category: string;
    action_description: string;
    confidence: number;
    created_at: string;
  }>;
}

export async function getSalesBriefingContext(
  supabase: SupabaseClient,
  forDate: Date,
): Promise<SalesBriefingContext> {
  // Compute UTC date window [start, end)
  const start = new Date(forDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const forDateStr = start.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Fetch systems
  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name");

  // Fetch signals in window
  const { data: signals } = await supabase
    .from("signals")
    .select("id, system_id, category, severity, summary, created_at")
    .gte("created_at", startISO)
    .lt("created_at", endISO);

  // Fetch news in window
  const { data: news } = await supabase
    .from("documents")
    .select("id, system_id, title, source_type, crawled_at")
    .eq("source_type", "news")
    .gte("crawled_at", startISO)
    .lt("crawled_at", endISO);

  // Fetch new opportunities created in window
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, system_id, title, status, created_at")
    .gte("created_at", startISO)
    .lt("created_at", endISO);

  // Fetch new interactions in window
  const { data: interactions } = await supabase
    .from("interactions")
    .select("id, system_id, channel, subject, summary, occurred_at")
    .gte("occurred_at", startISO)
    .lt("occurred_at", endISO);

  // Fetch new signal_actions in window
  const { data: signalActions } = await supabase
    .from("signal_actions")
    .select(
      "id, system_id, signal_id, action_category, action_description, confidence, created_at",
    )
    .gte("created_at", startISO)
    .lt("created_at", endISO);

  return {
    forDate: forDateStr,
    systems: systems ?? [],
    signals: signals ?? [],
    news: news ?? [],
    opportunities: opportunities ?? [],
    interactions: interactions ?? [],
    signalActions: signalActions ?? [],
  };
}

