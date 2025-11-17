import type { SupabaseClient } from "@supabase/supabase-js";

import type { Document, Entity, Signal, System } from "@/lib/types";

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

type EntityRow = {
  id: string;
  system_id: string | null;
  type: string | null;
  name: string | null;
  role: string | null;
  attributes: Record<string, unknown> | null;
  source_document_id: string | null;
};

type NewsRow = {
  id: string;
  system_id: string | null;
  source_url: string | null;
  source_type: string | null;
  title: string | null;
  raw_text: string | null;
  crawled_at: string | null;
};

export async function getSystemContext(
  supabase: SupabaseClient,
  systemId: string,
): Promise<{
  system: System;
  signals: Signal[];
  entities: Entity[];
  news: Document[];
}> {
  const [{ data: systemRow, error: systemError }, { data: signalRows, error: signalError }, { data: entityRows, error: entityError }, { data: newsRows, error: newsError }] =
    await Promise.all([
      supabase
        .from("systems")
        .select("id, slug, name, website")
        .eq("id", systemId)
        .maybeSingle<{ id: string; slug: string; name: string; website: string | null }>(),
      supabase
        .from("signals")
        .select("id, system_id, document_id, severity, category, summary, details, created_at")
        .eq("system_id", systemId)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<SignalRow[]>(),
      supabase
        .from("entities")
        .select("id, system_id, type, name, role, attributes, source_document_id")
        .eq("system_id", systemId)
        .limit(50)
        .returns<EntityRow[]>(),
      supabase
        .from("documents")
        .select("id, system_id, source_url, source_type, title, raw_text, crawled_at")
        .eq("system_id", systemId)
        .eq("source_type", "news")
        .order("crawled_at", { ascending: false })
        .limit(20)
        .returns<NewsRow[]>(),
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

  if (!systemRow) {
    throw new Error("System not found");
  }

  const system: System = {
    id: systemRow.id,
    slug: systemRow.slug,
    name: systemRow.name,
    website: systemRow.website ?? undefined,
  };

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

  const entities: Entity[] = (entityRows ?? []).map((row) => ({
    id: row.id,
    systemId: row.system_id ?? "",
    type: (row.type ?? "person") as Entity["type"],
    name: row.name ?? "",
    role: row.role ?? undefined,
    attributes: row.attributes ?? undefined,
    sourceDocumentId: row.source_document_id ?? undefined,
  }));

  const news: Document[] = (newsRows ?? []).map((row) => ({
    id: row.id,
    systemId: row.system_id ?? "",
    sourceUrl: row.source_url ?? "",
    sourceType: (row.source_type ?? "news") as Document["sourceType"],
    title: row.title ?? undefined,
    rawText: row.raw_text ?? undefined,
    crawledAt: row.crawled_at ?? undefined,
  }));

  return {
    system,
    signals,
    entities,
    news,
  };
}

