import type { SupabaseClient } from "@supabase/supabase-js";

import type { Document, Signal } from "@/lib/types";

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

type SignalRow = {
  id: string;
  category: string | null;
  severity: string | null;
  summary: string | null;
  created_at: string | null;
};

type NewsRow = {
  id: string;
  title: string | null;
  source_url: string | null;
  raw_text: string | null;
  crawled_at: string | null;
};

type OpportunityRow = {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  summary: unknown;
};

export async function getOutboundContext(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{
  system: SystemRow;
  signals: SignalRow[];
  news: NewsRow[];
  opportunities: OpportunityRow[];
  profile: ProfileRow | null;
}> {
  const [
    { data: systemRow, error: systemError },
    { data: signalRows, error: signalError },
    { data: newsRows, error: newsError },
    { data: opportunityRows, error: opportunityError },
    { data: profileRow, error: profileError },
  ] = await Promise.all([
    supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .eq("id", systemId)
      .maybeSingle<SystemRow>(),
    supabase
      .from("signals")
      .select("id, category, severity, summary, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<SignalRow[]>(),
    supabase
      .from("documents")
      .select("id, title, source_url, raw_text, crawled_at")
      .eq("system_id", systemId)
      .eq("source_type", "news")
      .order("crawled_at", { ascending: false })
      .limit(10)
      .returns<NewsRow[]>(),
    supabase
      .from("opportunities")
      .select("id, title, description, status, created_at")
      .eq("system_id", systemId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .returns<OpportunityRow[]>(),
    supabase
      .from("system_profiles")
      .select("id, summary")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ProfileRow>(),
  ]);

  if (systemError) {
    throw systemError;
  }

  if (signalError) {
    throw signalError;
  }

  if (newsError) {
    throw newsError;
  }

  if (opportunityError) {
    throw opportunityError;
  }

  if (profileError) {
    throw profileError;
  }

  if (!systemRow) {
    throw new Error("System not found");
  }

  return {
    system: systemRow,
    signals: signalRows ?? [],
    news: newsRows ?? [],
    opportunities: opportunityRows ?? [],
    profile: profileRow,
  };
}

