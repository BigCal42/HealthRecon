import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase.types";

export type DbOpportunity = Database["public"]["Tables"]["opportunities"]["Row"];
export type DbOpportunitySuggestion = Database["public"]["Tables"]["opportunity_suggestions"]["Row"];
export type DbSignal = Database["public"]["Tables"]["signals"]["Row"];
export type DbInteraction = Database["public"]["Tables"]["interactions"]["Row"];

/**
 * Combined view of opportunities workspace data for a system.
 */
export interface OpportunityWorkspaceView {
  systemId: string;
  systemSlug: string;
  systemName: string;
  topOpportunities: DbOpportunity[];
  openOpportunities: DbOpportunity[];
  suggestions: DbOpportunitySuggestion[];
  signals: DbSignal[];
  interactions: DbInteraction[];
}

/**
 * Get opportunities workspace view for a system by slug.
 */
export async function getOpportunityWorkspaceView(
  supabase: SupabaseClient<Database>,
  systemSlug: string,
): Promise<OpportunityWorkspaceView | null> {
  // Resolve system by slug
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", systemSlug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (systemError || !system) {
    return null;
  }

  // Fetch all four tables in parallel
  const [
    { data: opportunitiesData, error: opportunitiesError },
    { data: suggestionsData, error: suggestionsError },
    { data: signalsData, error: signalsError },
    { data: interactionsData, error: interactionsError },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, system_id, title, description, status, stage, priority, amount, currency, close_date, probability, source_kind, source_id, created_at, updated_at")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .returns<DbOpportunity[]>(),
    supabase
      .from("opportunity_suggestions")
      .select("id, system_id, title, description, source_kind, source_ids, created_at, accepted, accepted_opportunity_id")
      .eq("system_id", system.id)
      .eq("accepted", false)
      .order("created_at", { ascending: false })
      .returns<DbOpportunitySuggestion[]>(),
    supabase
      .from("signals")
      .select("id, system_id, document_id, severity, category, summary, details, created_at")
      .eq("system_id", system.id)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<DbSignal[]>(),
    supabase
      .from("interactions")
      .select("id, system_id, occurred_at, channel, subject, summary, next_step, next_step_due_at, created_at")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<DbInteraction[]>(),
  ]);

  if (opportunitiesError) {
    throw new Error(`Failed to fetch opportunities: ${opportunitiesError.message}`);
  }
  if (suggestionsError) {
    throw new Error(`Failed to fetch suggestions: ${suggestionsError.message}`);
  }
  if (signalsError) {
    throw new Error(`Failed to fetch signals: ${signalsError.message}`);
  }
  if (interactionsError) {
    throw new Error(`Failed to fetch interactions: ${interactionsError.message}`);
  }

  const opportunities = opportunitiesData ?? [];
  const suggestions = suggestionsData ?? [];
  const signals = signalsData ?? [];
  const interactions = interactionsData ?? [];

  // Rank opportunities: top = priority high OR stage early (not closed/won/lost)
  const topOpportunities = opportunities.filter(
    (opp) =>
      (opp.priority !== null && opp.priority >= 7) ||
      (opp.stage && ["discovery", "qualification", "proposal"].includes(opp.stage.toLowerCase())),
  );

  // Open opportunities = not closed/won/lost
  const openOpportunities = opportunities.filter(
    (opp) => !["closed", "won", "lost"].includes(opp.status.toLowerCase()),
  );

  return {
    systemId: system.id,
    systemSlug: system.slug,
    systemName: system.name,
    topOpportunities,
    openOpportunities,
    suggestions,
    signals,
    interactions,
  };
}

