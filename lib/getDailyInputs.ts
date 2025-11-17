import type { SupabaseClient } from "@supabase/supabase-js";

import type { Document, Signal } from "@/lib/types";

const HOURS_24_MS = 24 * 60 * 60 * 1000;

type SignalRow = {
  id: string;
  system_id: string | null;
  document_id: string | null;
  severity: string | null;
  category: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
  created_at: string | null;
};

type DocumentRow = {
  id: string;
  system_id: string | null;
  source_url: string | null;
  source_type: string | null;
  title: string | null;
  raw_text: string | null;
  crawled_at: string | null;
};

export async function getDailyInputs(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{ signals: Signal[]; documents: Document[] }> {
  const sinceIso = new Date(Date.now() - HOURS_24_MS).toISOString();

  const [{ data: signalRows, error: signalError }, { data: documentRows, error: documentError }] =
    await Promise.all([
      supabase
        .from("signals")
        .select(
          "id, system_id, document_id, severity, category, summary, details, created_at"
        )
        .eq("system_id", systemId)
        .gte("created_at", sinceIso)
        .returns<SignalRow[]>(),
      supabase
        .from("documents")
        .select("id, system_id, source_url, source_type, title, raw_text, crawled_at")
        .eq("system_id", systemId)
        .gte("crawled_at", sinceIso)
        .returns<DocumentRow[]>(),
    ]);

  if (signalError) {
    throw signalError;
  }

  if (documentError) {
    throw documentError;
  }

  const signals: Signal[] = (signalRows ?? []).map((row) => ({
    id: row.id,
    systemId: row.system_id ?? "",
    documentId: row.document_id ?? undefined,
    severity: (row.severity ?? "medium") as Signal["severity"],
    category: (row.category ?? "strategy") as Signal["category"],
    summary: row.summary ?? "",
    details: row.details ?? undefined,
    createdAt: row.created_at ?? undefined,
  }));

  const documents: Document[] = (documentRows ?? []).map((row) => ({
    id: row.id,
    systemId: row.system_id ?? "",
    sourceUrl: row.source_url ?? "",
    sourceType: (row.source_type ?? "website") as Document["sourceType"],
    title: row.title ?? undefined,
    rawText: row.raw_text ?? undefined,
    crawledAt: row.crawled_at ?? undefined,
  }));

  return {
    signals,
    documents,
  };
}

