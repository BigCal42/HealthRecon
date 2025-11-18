import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorklistInteractionItem {
  id: string;
  systemId: string;
  systemSlug: string;
  systemName: string;
  channel: string;
  subject: string | null;
  nextStep: string | null;
  nextStepDueAt: string | null;
  occurredAt: string | null;
}

export interface WorklistSystemActivityItem {
  systemId: string;
  systemSlug: string;
  systemName: string;
  lastActivityAt: string;
  activityKind: "signal" | "news";
}

export interface WorklistData {
  overdueInteractions: WorklistInteractionItem[];
  upcomingInteractions: WorklistInteractionItem[];
  recentActivity: WorklistSystemActivityItem[];
}

export async function getWorklist(
  supabase: SupabaseClient
): Promise<WorklistData> {
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNowIso = sevenDaysFromNow.toISOString();

  // 1) Load systems into a map for name/slug lookup
  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name");

  const systemMap = new Map<string, { slug: string; name: string }>();
  (systems ?? []).forEach((s) => {
    systemMap.set(s.id, { slug: s.slug, name: s.name });
  });

  // 2) Overdue interactions (next_step_due_at < now)
  const { data: overdue } = await supabase
    .from("interactions")
    .select(
      "id, system_id, channel, subject, summary, next_step, next_step_due_at, occurred_at"
    )
    .not("next_step_due_at", "is", null)
    .lt("next_step_due_at", nowIso)
    .order("next_step_due_at", { ascending: true })
    .limit(50);

  // 3) Upcoming interactions (now <= next_step_due_at <= now + 7 days)
  const { data: upcoming } = await supabase
    .from("interactions")
    .select(
      "id, system_id, channel, subject, summary, next_step, next_step_due_at, occurred_at"
    )
    .not("next_step_due_at", "is", null)
    .gte("next_step_due_at", nowIso)
    .lte("next_step_due_at", sevenDaysFromNowIso)
    .order("next_step_due_at", { ascending: true })
    .limit(50);

  // 4) Recent system activity from signals + news in last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const { data: recentSignals } = await supabase
    .from("signals")
    .select("system_id, created_at")
    .gte("created_at", sevenDaysAgoIso)
    .order("created_at", { ascending: false });

  const { data: recentNews } = await supabase
    .from("documents")
    .select("system_id, crawled_at")
    .eq("source_type", "news")
    .gte("crawled_at", sevenDaysAgoIso)
    .order("crawled_at", { ascending: false });

  const activityMap = new Map<string, WorklistSystemActivityItem>();

  (recentSignals ?? []).forEach((s) => {
    if (!s.system_id || !s.created_at) return;
    const sys = systemMap.get(s.system_id);
    if (!sys) return;
    const existing = activityMap.get(s.system_id);
    if (!existing || s.created_at > existing.lastActivityAt) {
      activityMap.set(s.system_id, {
        systemId: s.system_id,
        systemSlug: sys.slug,
        systemName: sys.name,
        lastActivityAt: s.created_at,
        activityKind: "signal"
      });
    }
  });

  (recentNews ?? []).forEach((d) => {
    if (!d.system_id || !d.crawled_at) return;
    const sys = systemMap.get(d.system_id);
    if (!sys) return;
    const existing = activityMap.get(d.system_id);
    if (!existing || d.crawled_at > existing.lastActivityAt) {
      activityMap.set(d.system_id, {
        systemId: d.system_id,
        systemSlug: sys.slug,
        systemName: sys.name,
        lastActivityAt: d.crawled_at,
        activityKind: "news"
      });
    }
  });

  const overdueInteractions: WorklistInteractionItem[] = (overdue ?? []).map(
    (i) => {
      const sys = systemMap.get(i.system_id) ?? { slug: "", name: "" };
      return {
        id: i.id,
        systemId: i.system_id,
        systemSlug: sys.slug,
        systemName: sys.name,
        channel: i.channel,
        subject: i.subject,
        nextStep: i.next_step,
        nextStepDueAt: i.next_step_due_at,
        occurredAt: i.occurred_at
      };
    }
  );

  const upcomingInteractions: WorklistInteractionItem[] = (upcoming ?? []).map(
    (i) => {
      const sys = systemMap.get(i.system_id) ?? { slug: "", name: "" };
      return {
        id: i.id,
        systemId: i.system_id,
        systemSlug: sys.slug,
        systemName: sys.name,
        channel: i.channel,
        subject: i.subject,
        nextStep: i.next_step,
        nextStepDueAt: i.next_step_due_at,
        occurredAt: i.occurred_at
      };
    }
  );

  const recentActivity = Array.from(activityMap.values()).sort((a, b) =>
    a.lastActivityAt < b.lastActivityAt ? 1 : -1
  );

  return {
    overdueInteractions,
    upcomingInteractions,
    recentActivity
  };
}

