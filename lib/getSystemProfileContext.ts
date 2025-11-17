import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileSystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
};

type ProfileSignalRow = {
  id: string;
  severity: string | null;
  category: string | null;
  summary: string | null;
  created_at: string | null;
};

type ProfileEntityRow = {
  id: string;
  type: string | null;
  name: string | null;
  role: string | null;
};

type ProfileNewsRow = {
  id: string;
  title: string | null;
  raw_text: string | null;
  crawled_at: string | null;
};

type ProfileOpportunityRow = {
  id: string;
  title: string | null;
  status: string | null;
};

type ProfileBriefingRow = {
  id: string;
  summary: string;
  created_at: string | null;
};

export async function getSystemProfileContext(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{
  system: ProfileSystemRow;
  signals: ProfileSignalRow[];
  entities: ProfileEntityRow[];
  news: ProfileNewsRow[];
  opportunities: ProfileOpportunityRow[];
  briefing: ProfileBriefingRow | null;
}> {
  const [
    { data: systemRow, error: systemError },
    { data: signalRows, error: signalError },
    { data: entityRows, error: entityError },
    { data: newsRows, error: newsError },
    { data: opportunityRows, error: opportunityError },
    { data: briefingRow, error: briefingError },
  ] = await Promise.all([
      supabase
      .from("systems")
      .select("id, slug, name, website")
      .eq("id", systemId)
        .maybeSingle<ProfileSystemRow>(),
    supabase
      .from("signals")
      .select("id, severity, category, summary, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
        .limit(50)
        .returns<ProfileSignalRow[]>(),
    supabase
      .from("entities")
      .select("id, type, name, role")
        .eq("system_id", systemId)
        .returns<ProfileEntityRow[]>(),
    supabase
      .from("documents")
      .select("id, title, raw_text, crawled_at")
      .eq("system_id", systemId)
      .eq("source_type", "news")
      .order("crawled_at", { ascending: false })
        .limit(15)
        .returns<ProfileNewsRow[]>(),
    supabase
      .from("opportunities")
      .select("id, title, status")
      .eq("system_id", systemId)
        .in("status", ["open", "in_progress"])
        .returns<ProfileOpportunityRow[]>(),
    supabase
      .from("daily_briefings")
      .select("id, summary, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(1)
        .maybeSingle<ProfileBriefingRow>(),
  ]);

  if (systemError) {
    throw systemError;
  }

  if (signalError) {
    throw signalError;
  }

  if (entityError) {
    throw entityError;
  }

  if (newsError) {
    throw newsError;
  }

  if (opportunityError) {
    throw opportunityError;
  }

  if (briefingError) {
    throw briefingError;
  }

  if (!systemRow) {
    throw new Error("System not found");
  }

  return {
    system: systemRow,
    signals: signalRows ?? [],
    entities: entityRows ?? [],
    news: newsRows ?? [],
    opportunities: opportunityRows ?? [],
    briefing: briefingRow,
  };
}

