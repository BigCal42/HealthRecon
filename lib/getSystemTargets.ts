import type { SupabaseClient } from "@supabase/supabase-js";

export type SystemPriorityBand = "hot" | "warm" | "cold";

export interface SystemTarget {
  systemId: string;
  slug: string;
  name: string;
  score: number;
  band: SystemPriorityBand;
  reasons: string[];
}

export async function getSystemTargets(
  supabase: SupabaseClient
): Promise<SystemTarget[]> {
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNowIso = sevenDaysFromNow.toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  // 1) Systems
  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name")
    .order("name", { ascending: true });

  if (!systems || systems.length === 0) {
    return [];
  }

  const systemIds = systems.map((s) => s.id);

  // 2) Opportunities (open/in_progress)
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("system_id, status")
    .in("system_id", systemIds)
    .in("status", ["open", "in_progress"]);

  // 3) Interactions for overdue/upcoming/recency
  const { data: interactions } = await supabase
    .from("interactions")
    .select("system_id, next_step_due_at, occurred_at")
    .in("system_id", systemIds);

  // 4) Recent signals (last 7 days)
  const { data: signals } = await supabase
    .from("signals")
    .select("system_id, created_at")
    .in("system_id", systemIds)
    .gte("created_at", sevenDaysAgoIso);

  // 5) Recent news (last 7 days)
  const { data: news } = await supabase
    .from("documents")
    .select("system_id, crawled_at")
    .in("system_id", systemIds)
    .eq("source_type", "news")
    .gte("crawled_at", sevenDaysAgoIso);

  // Build lookup maps
  const oppCountBySystem = new Map<string, number>();
  (opportunities ?? []).forEach((o) => {
    if (!o.system_id) return;
    oppCountBySystem.set(o.system_id, (oppCountBySystem.get(o.system_id) ?? 0) + 1);
  });

  const interactionInfoBySystem = new Map<
    string,
    {
      hasOverdue: boolean;
      hasUpcoming: boolean;
      hasRecent: boolean;
    }
  >();

  (interactions ?? []).forEach((i) => {
    if (!i.system_id) return;
    const info =
      interactionInfoBySystem.get(i.system_id) ?? {
        hasOverdue: false,
        hasUpcoming: false,
        hasRecent: false
      };

    if (i.next_step_due_at) {
      if (i.next_step_due_at < nowIso) {
        info.hasOverdue = true;
      } else if (
        i.next_step_due_at >= nowIso &&
        i.next_step_due_at <= sevenDaysFromNowIso
      ) {
        info.hasUpcoming = true;
      }
    }

    if (i.occurred_at && i.occurred_at >= thirtyDaysAgoIso) {
      info.hasRecent = true;
    }

    interactionInfoBySystem.set(i.system_id, info);
  });

  const hasRecentSignals = new Set<string>();
  (signals ?? []).forEach((s) => {
    if (s.system_id) hasRecentSignals.add(s.system_id);
  });

  const hasRecentNews = new Set<string>();
  (news ?? []).forEach((d) => {
    if (d.system_id) hasRecentNews.add(d.system_id);
  });

  function bandForScore(score: number): SystemPriorityBand {
    if (score >= 7) return "hot";
    if (score >= 3) return "warm";
    return "cold";
  }

  const targets: SystemTarget[] = systems.map((s) => {
    let score = 0;
    const reasons: string[] = [];

    const oppCount = Math.min(oppCountBySystem.get(s.id) ?? 0, 3);
    if (oppCount > 0) {
      score += oppCount * 3;
      reasons.push(`${oppCount} open/in-progress opportunities`);
    }

    const interactionInfo = interactionInfoBySystem.get(s.id);
    if (interactionInfo?.hasOverdue) {
      score += 2;
      reasons.push("Overdue next steps");
    }

    if (interactionInfo?.hasUpcoming) {
      score += 1;
      reasons.push("Upcoming next steps");
    }

    if (interactionInfo?.hasRecent) {
      score += 1;
      reasons.push("Recent interactions");
    }

    if (hasRecentSignals.has(s.id)) {
      score += 2;
      reasons.push("Recent signals (last 7 days)");
    }

    if (hasRecentNews.has(s.id)) {
      score += 1;
      reasons.push("Recent news (last 7 days)");
    }

    const band = bandForScore(score);

    return {
      systemId: s.id,
      slug: s.slug,
      name: s.name,
      score,
      band,
      reasons
    };
  });

  // Sort by score desc, then name
  targets.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return targets;
}

