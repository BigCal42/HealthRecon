import type { SupabaseClient } from "@supabase/supabase-js";

export interface SystemSeed {
  id: string;
  systemId: string;
  url: string;
  isActive: boolean;
  label?: string | null;
  priority?: number | null;
  lastCrawledAt?: string | null;
}

export interface SystemIngestionConfig {
  systemId: string;
  slug: string;
  name: string;
  seeds: SystemSeed[];
}

export async function getSystemIngestionConfig(
  supabase: SupabaseClient,
  systemSlug: string,
): Promise<SystemIngestionConfig | null> {
  // Resolve system by slug
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", systemSlug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (systemError) {
    throw systemError;
  }

  if (!system) {
    return null;
  }

  // Fetch seeds ordered by priority (nulls first), then created_at
  const { data: seeds, error: seedsError } = await supabase
    .from("system_seeds")
    .select("id, system_id, url, active, label, priority, last_crawled_at")
    .eq("system_id", system.id)
    .order("priority", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (seedsError) {
    throw seedsError;
  }

  // Map rows to SystemSeed[]
  const mappedSeeds: SystemSeed[] = (seeds ?? []).map((seed) => ({
    id: seed.id,
    systemId: seed.system_id,
    url: seed.url,
    isActive: seed.active,
    label: seed.label ?? null,
    priority: seed.priority ?? null,
    lastCrawledAt: seed.last_crawled_at ?? null,
  }));

  return {
    systemId: system.id,
    slug: system.slug,
    name: system.name,
    seeds: mappedSeeds,
  };
}

