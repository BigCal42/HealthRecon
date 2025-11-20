import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase.types";

export type DbAccountPlan = Database["public"]["Tables"]["account_plans"]["Row"];
export type DbSystemProfile = Database["public"]["Tables"]["system_profiles"]["Row"];

/**
 * Account plan summary structure stored in account_plans.summary JSON field.
 */
export interface AccountPlanSummary {
  account_overview: string;
  business_objectives: string[];
  current_state: string[];
  key_stakeholders: string[];
  opportunity_themes: string[];
  risks_and_blocks: string[];
  strategy_and_plays: string[];
  near_term_actions: string[];
}

/**
 * Combined view of account plan data for a system.
 */
export interface AccountPlanView {
  systemId: string;
  systemSlug: string;
  systemName: string;
  profile: DbSystemProfile | null;
  plan: DbAccountPlan | null;
}

/**
 * Input for updating an account plan.
 * Excludes id, system_id, and timestamps (managed by DB).
 */
export interface AccountPlanUpdateInput {
  summary: AccountPlanSummary;
}

/**
 * Transform raw JSON summary to typed AccountPlanSummary.
 */
export function transformAccountPlanSummary(summary: unknown): AccountPlanSummary | null {
  if (!summary || typeof summary !== "object") {
    return null;
  }

  const obj = summary as Record<string, unknown>;

  return {
    account_overview: typeof obj.account_overview === "string" ? obj.account_overview : "",
    business_objectives: Array.isArray(obj.business_objectives)
      ? obj.business_objectives.filter((v): v is string => typeof v === "string")
      : [],
    current_state: Array.isArray(obj.current_state)
      ? obj.current_state.filter((v): v is string => typeof v === "string")
      : [],
    key_stakeholders: Array.isArray(obj.key_stakeholders)
      ? obj.key_stakeholders.filter((v): v is string => typeof v === "string")
      : [],
    opportunity_themes: Array.isArray(obj.opportunity_themes)
      ? obj.opportunity_themes.filter((v): v is string => typeof v === "string")
      : [],
    risks_and_blocks: Array.isArray(obj.risks_and_blocks)
      ? obj.risks_and_blocks.filter((v): v is string => typeof v === "string")
      : [],
    strategy_and_plays: Array.isArray(obj.strategy_and_plays)
      ? obj.strategy_and_plays.filter((v): v is string => typeof v === "string")
      : [],
    near_term_actions: Array.isArray(obj.near_term_actions)
      ? obj.near_term_actions.filter((v): v is string => typeof v === "string")
      : [],
  };
}

/**
 * Get account plan view for a system by slug.
 */
export async function getAccountPlanView(
  supabase: SupabaseClient<Database>,
  systemSlug: string,
): Promise<AccountPlanView | null> {
  // Resolve system by slug
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", systemSlug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (systemError || !system) {
    return null;
  }

  // Fetch system profile (most recent)
  const { data: profile, error: profileError } = await supabase
    .from("system_profiles")
    .select("id, system_id, summary, created_at")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DbSystemProfile>();

  if (profileError) {
    // Log but don't fail - profile is optional
    logger.error(profileError, "Failed to fetch system profile", { systemSlug });
  }

  // Fetch account plan (most recent)
  const { data: plan, error: planError } = await supabase
    .from("account_plans")
    .select("id, system_id, summary, created_at")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DbAccountPlan>();

  if (planError) {
    // Log but don't fail - plan may not exist yet
    logger.error(planError, "Failed to fetch account plan", { systemSlug });
  }

  return {
    systemId: system.id,
    systemSlug: system.slug,
    systemName: system.name,
    profile: profile ?? null,
    plan: plan ?? null,
  };
}

/**
 * Upsert account plan for a system.
 */
export async function upsertAccountPlan(
  supabase: SupabaseClient<Database>,
  systemSlug: string,
  input: AccountPlanUpdateInput,
): Promise<DbAccountPlan> {
  // Resolve system by slug
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id")
    .eq("slug", systemSlug)
    .maybeSingle<{ id: string }>();

  if (systemError || !system) {
    throw new Error("System not found");
  }

  // Check if plan exists
  const { data: existingPlan } = await supabase
    .from("account_plans")
    .select("id")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingPlan) {
    // Update existing plan
    const { data: updated, error: updateError } = await supabase
      .from("account_plans")
      .update({
        summary: input.summary as unknown as Database["public"]["Tables"]["account_plans"]["Row"]["summary"],
      })
      .eq("id", existingPlan.id)
      .select("id, system_id, summary, created_at")
      .single<DbAccountPlan>();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to update account plan");
    }

    return updated;
  } else {
    // Insert new plan
    const { data: inserted, error: insertError } = await supabase
      .from("account_plans")
      .insert({
        system_id: system.id,
        summary: input.summary as unknown as Database["public"]["Tables"]["account_plans"]["Row"]["summary"],
      })
      .select("id, system_id, summary, created_at")
      .single<DbAccountPlan>();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Failed to insert account plan");
    }

    return inserted;
  }
}

