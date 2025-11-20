import type { SupabaseClient } from "@supabase/supabase-js";

export interface SystemPortfolioItem {
  id: string;
  slug: string;
  name: string;
  website?: string | null;
  hqCity?: string | null;
  hqState?: string | null;
  seedCount: number;
  activeSeedCount: number;
  documentCount: number;
  lastIngestedAt: string | null;
}

export interface SystemPortfolio {
  items: SystemPortfolioItem[];
}

export async function getSystemPortfolio(
  supabase: SupabaseClient,
): Promise<SystemPortfolio> {
  // Fetch all systems
  const { data: systems, error: systemsError } = await supabase
    .from("systems")
    .select("id, slug, name, website, hq_city, hq_state")
    .order("name", { ascending: true });

  if (systemsError) {
    throw systemsError;
  }

  if (!systems || systems.length === 0) {
    return { items: [] };
  }

  // Fetch all seeds
  const { data: seeds, error: seedsError } = await supabase
    .from("system_seeds")
    .select("id, system_id, active, last_crawled_at");

  if (seedsError) {
    throw seedsError;
  }

  // Fetch all documents
  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, system_id, crawled_at");

  if (documentsError) {
    throw documentsError;
  }

  // Aggregate data per system
  const items: SystemPortfolioItem[] = systems.map((system) => {
    const systemSeeds = (seeds ?? []).filter((s) => s.system_id === system.id);
    const systemDocuments = (documents ?? []).filter(
      (d) => d.system_id === system.id,
    );

    const seedCount = systemSeeds.length;
    const activeSeedCount = systemSeeds.filter((s) => s.active).length;
    const documentCount = systemDocuments.length;

    // Compute lastIngestedAt as max of:
    // - max(last_crawled_at) from seeds
    // - max(crawled_at) from documents
    const seedLastCrawled = systemSeeds
      .map((s) => s.last_crawled_at)
      .filter((d): d is string => d !== null)
      .sort()
      .pop();

    const docLastCrawled = systemDocuments
      .map((d) => d.crawled_at)
      .filter((d): d is string => d !== null)
      .sort()
      .pop();

    let lastIngestedAt: string | null = null;
    if (seedLastCrawled && docLastCrawled) {
      lastIngestedAt =
        seedLastCrawled > docLastCrawled ? seedLastCrawled : docLastCrawled;
    } else if (seedLastCrawled) {
      lastIngestedAt = seedLastCrawled;
    } else if (docLastCrawled) {
      lastIngestedAt = docLastCrawled;
    }

    return {
      id: system.id,
      slug: system.slug,
      name: system.name,
      website: system.website,
      hqCity: system.hq_city,
      hqState: system.hq_state,
      seedCount,
      activeSeedCount,
      documentCount,
      lastIngestedAt,
    };
  });

  return { items };
}

