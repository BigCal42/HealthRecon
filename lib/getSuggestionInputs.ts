import type { SupabaseClient } from "@supabase/supabase-js";

type SuggestionSignal = {
  id: string;
  category: string | null;
  severity: string | null;
  summary: string | null;
  details: string | null;
  created_at: string | null;
};

type SuggestionNews = {
  id: string;
  title: string | null;
  source_url: string;
  raw_text: string | null;
  crawled_at: string | null;
};

export async function getSuggestionInputs(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{
  signals: SuggestionSignal[];
  news: SuggestionNews[];
}> {
  const [{ data: signals }, { data: news }] = await Promise.all([
    supabase
      .from("signals")
      .select("id, category, severity, summary, details, created_at")
      .eq("system_id", systemId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<SuggestionSignal[]>(),
    supabase
      .from("documents")
      .select("id, title, source_url, raw_text, crawled_at")
      .eq("system_id", systemId)
      .eq("source_type", "news")
      .order("crawled_at", { ascending: false })
      .limit(10)
      .returns<SuggestionNews[]>(),
  ]);

  return {
    signals: signals ?? [],
    news: news ?? [],
  };
}

