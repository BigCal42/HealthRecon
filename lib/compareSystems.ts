import type { SupabaseClient } from "@supabase/supabase-js";

import { getSingleSystemHealthScore } from "./getSingleSystemHealthScore";

export interface SystemComparison {
  systemA: { slug: string; name: string };
  systemB: { slug: string; name: string };
  summary: string[];
  categoryComparisons: {
    signals: {
      a: { high: number; medium: number; low: number; last30: number };
      b: { high: number; medium: number; low: number; last30: number };
      narrative: string;
    };
    technology: {
      a: string[];
      b: string[];
      overlap: string[];
      uniqueA: string[];
      uniqueB: string[];
      narrative: string;
    };
    opportunities: {
      aOpen: number;
      bOpen: number;
      aProgress: number;
      bProgress: number;
      narrative: string;
    };
    interactions: {
      last14A: number;
      last14B: number;
      last60A: number;
      last60B: number;
      narrative: string;
    };
    contacts: {
      aExecs: number;
      bExecs: number;
      aChampions: number;
      bChampions: number;
      narrative: string;
    };
  };
  healthComparison: {
    scoreA: number;
    bandA: string;
    scoreB: number;
    bandB: string;
    narrative: string;
  };
  finalInsights: string[];
  executiveBrief?: string;
}

type SignalRow = {
  severity: string;
  category: string;
  created_at: string;
};

type NewsRow = {
  title: string | null;
  crawled_at: string | null;
};

type OpportunityRow = {
  status: string;
};

type InteractionRow = {
  occurred_at: string;
};

type ContactRow = {
  seniority: string | null;
  role_in_deal: string | null;
};

type EntityRow = {
  type: string;
  name: string;
};

export async function compareSystems(
  supabase: SupabaseClient,
  systemAId: string,
  systemBId: string,
): Promise<SystemComparison> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch system info
  const [{ data: systemA }, { data: systemB }] = await Promise.all([
    supabase
      .from("systems")
      .select("id, slug, name")
      .eq("id", systemAId)
      .maybeSingle<{ id: string; slug: string; name: string }>(),
    supabase
      .from("systems")
      .select("id, slug, name")
      .eq("id", systemBId)
      .maybeSingle<{ id: string; slug: string; name: string }>(),
  ]);

  if (!systemA || !systemB) {
    throw new Error("System not found");
  }

  // Fetch all data for both systems in parallel
  const [
    { data: signalsA },
    { data: signalsB },
    { data: newsA },
    { data: newsB },
    { data: opportunitiesA },
    { data: opportunitiesB },
    { data: interactionsA },
    { data: interactionsB },
    { data: contactsA },
    { data: contactsB },
    { data: entitiesA },
    { data: entitiesB },
    healthA,
    healthB,
  ] = await Promise.all([
    // Signals (last 90 days)
    supabase
      .from("signals")
      .select("severity, category, created_at")
      .eq("system_id", systemAId)
      .gte("created_at", ninetyDaysAgo)
      .returns<SignalRow[]>(),
    supabase
      .from("signals")
      .select("severity, category, created_at")
      .eq("system_id", systemBId)
      .gte("created_at", ninetyDaysAgo)
      .returns<SignalRow[]>(),
    // News (last 90 days)
    supabase
      .from("documents")
      .select("title, crawled_at")
      .eq("system_id", systemAId)
      .eq("source_type", "news")
      .gte("crawled_at", ninetyDaysAgo)
      .returns<NewsRow[]>(),
    supabase
      .from("documents")
      .select("title, crawled_at")
      .eq("system_id", systemBId)
      .eq("source_type", "news")
      .gte("crawled_at", ninetyDaysAgo)
      .returns<NewsRow[]>(),
    // Opportunities (all)
    supabase
      .from("opportunities")
      .select("status")
      .eq("system_id", systemAId)
      .returns<OpportunityRow[]>(),
    supabase
      .from("opportunities")
      .select("status")
      .eq("system_id", systemBId)
      .returns<OpportunityRow[]>(),
    // Interactions (last 60 days)
    supabase
      .from("interactions")
      .select("occurred_at")
      .eq("system_id", systemAId)
      .gte("occurred_at", sixtyDaysAgo)
      .returns<InteractionRow[]>(),
    supabase
      .from("interactions")
      .select("occurred_at")
      .eq("system_id", systemBId)
      .gte("occurred_at", sixtyDaysAgo)
      .returns<InteractionRow[]>(),
    // Contacts
    supabase
      .from("contacts")
      .select("seniority, role_in_deal")
      .eq("system_id", systemAId)
      .returns<ContactRow[]>(),
    supabase
      .from("contacts")
      .select("seniority, role_in_deal")
      .eq("system_id", systemBId)
      .returns<ContactRow[]>(),
    // Entities (for tech stack, vendors, initiatives)
    supabase
      .from("entities")
      .select("type, name")
      .eq("system_id", systemAId)
      .returns<EntityRow[]>(),
    supabase
      .from("entities")
      .select("type, name")
      .eq("system_id", systemBId)
      .returns<EntityRow[]>(),
    // Health scores
    getSingleSystemHealthScore(supabase, systemAId),
    getSingleSystemHealthScore(supabase, systemBId),
  ]);

  // Process signals
  const processSignals = (signals: SignalRow[] | null) => {
    const all = signals ?? [];
    const last30 = all.filter((s) => s.created_at >= thirtyDaysAgo);
    return {
      high: all.filter((s) => s.severity === "high").length,
      medium: all.filter((s) => s.severity === "medium").length,
      low: all.filter((s) => s.severity === "low").length,
      last30: last30.length,
    };
  };

  const signalsDataA = processSignals(signalsA);
  const signalsDataB = processSignals(signalsB);

  // Process technology stack
  const techA = (entitiesA ?? []).filter((e) => e.type === "technology").map((e) => e.name);
  const techB = (entitiesB ?? []).filter((e) => e.type === "technology").map((e) => e.name);
  const techSetA = new Set(techA);
  const techSetB = new Set(techB);
  const overlap = techA.filter((t) => techSetB.has(t));
  const uniqueA = techA.filter((t) => !techSetB.has(t));
  const uniqueB = techB.filter((t) => !techSetA.has(t));

  // Process opportunities
  const oppsA = opportunitiesA ?? [];
  const oppsB = opportunitiesB ?? [];
  const aOpen = oppsA.filter((o) => o.status === "open").length;
  const bOpen = oppsB.filter((o) => o.status === "open").length;
  const aProgress = oppsA.filter((o) => o.status === "in_progress").length;
  const bProgress = oppsB.filter((o) => o.status === "in_progress").length;

  // Process interactions
  const interactionsA_data = interactionsA ?? [];
  const interactionsB_data = interactionsB ?? [];
  const last14A = interactionsA_data.filter((i) => i.occurred_at >= fourteenDaysAgo).length;
  const last14B = interactionsB_data.filter((i) => i.occurred_at >= fourteenDaysAgo).length;
  const last60A = interactionsA_data.length;
  const last60B = interactionsB_data.length;

  // Process contacts
  const contactsA_data = contactsA ?? [];
  const contactsB_data = contactsB ?? [];
  const aExecs = contactsA_data.filter((c) => c.seniority === "exec").length;
  const bExecs = contactsB_data.filter((c) => c.seniority === "exec").length;
  const aChampions = contactsA_data.filter(
    (c) => c.role_in_deal === "champion" || c.role_in_deal === "decision_maker",
  ).length;
  const bChampions = contactsB_data.filter(
    (c) => c.role_in_deal === "champion" || c.role_in_deal === "decision_maker",
  ).length;

  // Process health scores
  const healthScoreA = healthA?.overallScore ?? 0;
  const healthBandA = healthA?.band ?? "at_risk";
  const healthScoreB = healthB?.overallScore ?? 0;
  const healthBandB = healthB?.band ?? "at_risk";

  // Generate summary bullets (placeholder for Phase 1)
  const summary: string[] = [
    `${systemA.name} has ${signalsDataA.high + signalsDataA.medium + signalsDataA.low} signals vs ${systemB.name}'s ${signalsDataB.high + signalsDataB.medium + signalsDataB.low}`,
    `${systemA.name} has ${techA.length} technologies vs ${systemB.name}'s ${techB.length}`,
    `${systemA.name} health score: ${healthScoreA} (${healthBandA}) vs ${systemB.name}: ${healthScoreB} (${healthBandB})`,
  ];

  // Final insights (placeholder for Phase 1)
  const finalInsights: string[] = [
    "pending_generation",
    "pending_generation",
    "pending_generation",
  ];

  return {
    systemA: { slug: systemA.slug, name: systemA.name },
    systemB: { slug: systemB.slug, name: systemB.name },
    summary,
    categoryComparisons: {
      signals: {
        a: signalsDataA,
        b: signalsDataB,
        narrative: "pending_generation",
      },
      technology: {
        a: techA,
        b: techB,
        overlap,
        uniqueA,
        uniqueB,
        narrative: "pending_generation",
      },
      opportunities: {
        aOpen,
        bOpen,
        aProgress,
        bProgress,
        narrative: "pending_generation",
      },
      interactions: {
        last14A,
        last14B,
        last60A,
        last60B,
        narrative: "pending_generation",
      },
      contacts: {
        aExecs,
        bExecs,
        aChampions,
        bChampions,
        narrative: "pending_generation",
      },
    },
    healthComparison: {
      scoreA: healthScoreA,
      bandA: healthBandA,
      scoreB: healthScoreB,
      bandB: healthBandB,
      narrative: "pending_generation",
    },
    finalInsights,
  };
}

