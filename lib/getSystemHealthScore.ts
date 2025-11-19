import type { SupabaseClient } from "@supabase/supabase-js";

export type HealthBand = "strong" | "watch" | "at_risk";

export interface SystemHealthScore {
  systemId: string;
  slug: string;
  name: string;
  overallScore: number; // 0–100
  band: HealthBand;
  components: {
    engagementScore: number; // 0–30
    opportunityScore: number; // 0–30
    signalScore: number; // 0–20
    riskScore: number; // 0–20 (higher risk = lower health)
  };
  reasons: string[];
}

type SystemRow = {
  id: string;
  slug: string;
  name: string;
};

type OpportunityRow = {
  system_id: string;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type InteractionRow = {
  system_id: string;
  occurred_at: string;
  next_step_due_at: string | null;
};

type SignalRow = {
  system_id: string;
  severity: string;
  created_at: string;
};

type SignalActionRow = {
  system_id: string;
  created_at: string;
};

type AccountPlanRow = {
  system_id: string;
  created_at: string;
};

type ContactRow = {
  system_id: string;
  seniority: string | null;
  role_in_deal: string | null;
  is_primary: boolean;
};

function bandForScore(score: number): HealthBand {
  if (score >= 70) return "strong";
  if (score >= 40) return "watch";
  return "at_risk";
}

function computeEngagementScore(
  interactions: InteractionRow[],
  signalActions: SignalActionRow[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Check interactions recency
  const recentInteractions = interactions.filter(
    (i) => new Date(i.occurred_at).getTime() >= fourteenDaysAgo,
  );
  const olderInteractions = interactions.filter(
    (i) =>
      new Date(i.occurred_at).getTime() >= thirtyDaysAgo &&
      new Date(i.occurred_at).getTime() < fourteenDaysAgo,
  );

  if (recentInteractions.length > 0) {
    score += 20;
    reasons.push("Recent interactions in last 14 days");
  } else if (olderInteractions.length > 0) {
    score += 10;
    reasons.push("Interactions in last 30 days");
  }

  // Check signal actions recency
  const recentSignalActions = signalActions.filter(
    (sa) => new Date(sa.created_at).getTime() >= fourteenDaysAgo,
  );
  const olderSignalActions = signalActions.filter(
    (sa) =>
      new Date(sa.created_at).getTime() >= thirtyDaysAgo &&
      new Date(sa.created_at).getTime() < fourteenDaysAgo,
  );

  if (recentSignalActions.length > 0) {
    score += 10;
    reasons.push("Signal actions generated in last 14 days");
  } else if (olderSignalActions.length > 0) {
    score += 5;
    reasons.push("Signal actions in last 30 days");
  }

  return { score: Math.min(30, score), reasons };
}

function computeOpportunityScore(
  opportunities: OpportunityRow[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const openOpps = opportunities.filter(
    (o) => o.status === "open" || o.status === "in_progress",
  );
  const openOppsCount = Math.min(3, openOpps.length);
  score += openOppsCount * 8;

  if (openOppsCount > 0) {
    reasons.push(`${openOppsCount} open/in-progress ${openOppsCount === 1 ? "opportunity" : "opportunities"}`);
  }

  // Check if any opp updated/created in last 30 days
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentOpps = opportunities.filter((o) => {
    const updateTime = o.updated_at
      ? new Date(o.updated_at).getTime()
      : new Date(o.created_at).getTime();
    return updateTime >= thirtyDaysAgo;
  });

  if (recentOpps.length > 0) {
    score += 6;
    reasons.push("Opportunities updated/created in last 30 days");
  }

  return { score: Math.min(30, score), reasons };
}

function computeSignalScore(signals: SignalRow[]): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentSignals = signals.filter(
    (s) => new Date(s.created_at).getTime() >= thirtyDaysAgo,
  );

  let highCount = 0;
  let mediumCount = 0;
  let hasLow = false;

  recentSignals.forEach((s) => {
    if (s.severity === "high") {
      highCount++;
    } else if (s.severity === "medium") {
      mediumCount++;
    } else if (s.severity === "low") {
      hasLow = true;
    }
  });

  const highScore = Math.min(2, highCount) * 5; // Max 2 high signals * 5 = 10
  const mediumScore = Math.min(2, mediumCount) * 3; // Max 2 medium signals * 3 = 6

  score += highScore;
  score += mediumScore;
  if (hasLow) {
    score += 2;
  }

  if (highCount > 0) {
    reasons.push(`${highCount} high-severity ${highCount === 1 ? "signal" : "signals"} in last 30 days`);
  }
  if (mediumCount > 0) {
    reasons.push(`${mediumCount} medium-severity ${mediumCount === 1 ? "signal" : "signals"} in last 30 days`);
  }
  if (hasLow) {
    reasons.push("Low-severity signals detected");
  }

  return { score: Math.min(20, score), reasons };
}

function computeRiskScore(
  interactions: InteractionRow[],
  opportunities: OpportunityRow[],
  contacts: ContactRow[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const now = Date.now();
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

  // Check for no interactions in last 60 days
  const recentInteractions = interactions.filter(
    (i) => new Date(i.occurred_at).getTime() >= sixtyDaysAgo,
  );
  if (recentInteractions.length === 0 && interactions.length > 0) {
    score += 10;
    reasons.push("No interactions in last 60 days (risk)");
  }

  // Check for no open/in_progress opps
  const openOpps = opportunities.filter(
    (o) => o.status === "open" || o.status === "in_progress",
  );
  if (openOpps.length === 0) {
    score += 5;
    reasons.push("No open/in-progress opportunities (risk)");
  }

  // Check for no exec/champion contacts
  const hasExecOrChampion = contacts.some(
    (c) =>
      c.seniority === "exec" ||
      c.role_in_deal === "decision_maker" ||
      c.role_in_deal === "champion",
  );
  if (!hasExecOrChampion && contacts.length > 0) {
    score += 5;
    reasons.push("No executive/champion contacts (risk)");
  }

  return { score: Math.min(20, score), reasons };
}

export async function getSystemHealthScores(
  supabase: SupabaseClient,
): Promise<SystemHealthScore[]> {
  // Fetch all systems
  const { data: systems, error: systemsError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .order("name", { ascending: true })
    .returns<SystemRow[]>();

  if (systemsError) {
    throw systemsError;
  }

  if (!systems || systems.length === 0) {
    return [];
  }

  const systemIds = systems.map((s) => s.id);

  // Fetch all related data in parallel
  const [
    { data: opportunities },
    { data: interactions },
    { data: signals },
    { data: signalActions },
    { data: accountPlans },
    { data: contacts },
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("system_id, status, created_at, updated_at")
      .in("system_id", systemIds)
      .returns<OpportunityRow[]>(),
    supabase
      .from("interactions")
      .select("system_id, occurred_at, next_step_due_at")
      .in("system_id", systemIds)
      .returns<InteractionRow[]>(),
    supabase
      .from("signals")
      .select("system_id, severity, created_at")
      .in("system_id", systemIds)
      .returns<SignalRow[]>(),
    supabase
      .from("signal_actions")
      .select("system_id, created_at")
      .in("system_id", systemIds)
      .returns<SignalActionRow[]>(),
    supabase
      .from("account_plans")
      .select("system_id, created_at")
      .in("system_id", systemIds)
      .order("created_at", { ascending: false })
      .returns<AccountPlanRow[]>(),
    supabase
      .from("contacts")
      .select("system_id, seniority, role_in_deal, is_primary")
      .in("system_id", systemIds)
      .returns<ContactRow[]>(),
  ]);

  // Group data by system_id
  const opportunitiesBySystem = new Map<string, OpportunityRow[]>();
  const interactionsBySystem = new Map<string, InteractionRow[]>();
  const signalsBySystem = new Map<string, SignalRow[]>();
  const signalActionsBySystem = new Map<string, SignalActionRow[]>();
  const contactsBySystem = new Map<string, ContactRow[]>();

  (opportunities ?? []).forEach((opp) => {
    if (opp.system_id) {
      const existing = opportunitiesBySystem.get(opp.system_id) ?? [];
      existing.push(opp);
      opportunitiesBySystem.set(opp.system_id, existing);
    }
  });

  (interactions ?? []).forEach((interaction) => {
    if (interaction.system_id) {
      const existing = interactionsBySystem.get(interaction.system_id) ?? [];
      existing.push(interaction);
      interactionsBySystem.set(interaction.system_id, existing);
    }
  });

  (signals ?? []).forEach((signal) => {
    if (signal.system_id) {
      const existing = signalsBySystem.get(signal.system_id) ?? [];
      existing.push(signal);
      signalsBySystem.set(signal.system_id, existing);
    }
  });

  (signalActions ?? []).forEach((sa) => {
    if (sa.system_id) {
      const existing = signalActionsBySystem.get(sa.system_id) ?? [];
      existing.push(sa);
      signalActionsBySystem.set(sa.system_id, existing);
    }
  });

  (contacts ?? []).forEach((contact) => {
    if (contact.system_id) {
      const existing = contactsBySystem.get(contact.system_id) ?? [];
      existing.push(contact);
      contactsBySystem.set(contact.system_id, existing);
    }
  });

  // Compute scores for each system
  const scores: SystemHealthScore[] = systems.map((system) => {
    const systemOpportunities = opportunitiesBySystem.get(system.id) ?? [];
    const systemInteractions = interactionsBySystem.get(system.id) ?? [];
    const systemSignals = signalsBySystem.get(system.id) ?? [];
    const systemSignalActions = signalActionsBySystem.get(system.id) ?? [];
    const systemContacts = contactsBySystem.get(system.id) ?? [];

    const engagement = computeEngagementScore(
      systemInteractions,
      systemSignalActions,
    );
    const opportunity = computeOpportunityScore(systemOpportunities);
    const signal = computeSignalScore(systemSignals);
    const risk = computeRiskScore(
      systemInteractions,
      systemOpportunities,
      systemContacts,
    );

    const rawScore =
      engagement.score + opportunity.score + signal.score - risk.score;
    const overallScore = Math.max(0, Math.min(100, rawScore));
    const band = bandForScore(overallScore);

    const allReasons = [
      ...engagement.reasons,
      ...opportunity.reasons,
      ...signal.reasons,
      ...risk.reasons,
    ];

    return {
      systemId: system.id,
      slug: system.slug,
      name: system.name,
      overallScore,
      band,
      components: {
        engagementScore: engagement.score,
        opportunityScore: opportunity.score,
        signalScore: signal.score,
        riskScore: risk.score,
      },
      reasons: allReasons,
    };
  });

  // Sort by overallScore desc, then name
  scores.sort((a, b) => {
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    return a.name.localeCompare(b.name);
  });

  return scores;
}

