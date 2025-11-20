import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";
import type { OpportunityStage } from "./opportunityStages";
import { isOpportunityStage } from "./opportunityStages";

type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];

export interface SystemOpportunity extends OpportunityRow {
  system_slug?: string;
  system_name?: string;
}

export interface SystemOpportunityBuckets {
  systemId: string;
  systemSlug: string;
  systemName: string;
  stages: Record<OpportunityStage, SystemOpportunity[]>;
}

export async function getSystemOpportunities(
  supabase: SupabaseClient,
  systemSlug: string
): Promise<SystemOpportunityBuckets | null> {
  // Resolve system
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", systemSlug)
    .maybeSingle();

  if (systemError || !system) return null;

  // Fetch all opportunities for that system (no deleted filter needed as there's no deleted_at column)
  const { data: opportunities, error: oppError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("system_id", system.id);

  if (oppError) {
    // Return empty bucket structure on error
    const emptyStages: Record<OpportunityStage, SystemOpportunity[]> = {
      discovery: [],
      qualifying: [],
      proposal: [],
      negotiation: [],
      closed_won: [],
      closed_lost: [],
    };
    return {
      systemId: system.id,
      systemSlug: system.slug,
      systemName: system.name,
      stages: emptyStages,
    };
  }

  // Build buckets
  const stages: Record<OpportunityStage, SystemOpportunity[]> = {
    discovery: [],
    qualifying: [],
    proposal: [],
    negotiation: [],
    closed_won: [],
    closed_lost: [],
  };

  for (const opp of opportunities ?? []) {
    const stage = isOpportunityStage(opp.stage ?? "") ? (opp.stage as OpportunityStage) : "discovery";

    stages[stage].push({
      ...opp,
      system_slug: system.slug,
      system_name: system.name,
    });
  }

  // Sort within each stage by priority (ASC, nulls last), then close_date, then created_at
  for (const s of Object.keys(stages) as OpportunityStage[]) {
    stages[s].sort((a, b) => {
      const pa = a.priority ?? 999999;
      const pb = b.priority ?? 999999;
      if (pa !== pb) return pa - pb;

      const ca = a.close_date || a.created_at || "";
      const cb = b.close_date || b.created_at || "";
      return ca < cb ? -1 : ca > cb ? 1 : 0;
    });
  }

  return {
    systemId: system.id,
    systemSlug: system.slug,
    systemName: system.name,
    stages,
  };
}

