import type { SupabaseClient } from "@supabase/supabase-js";
import { getSingleSystemHealthScore } from "./getSingleSystemHealthScore";
import { getTodayFocus } from "./getTodayFocus";
import { getSystemTimeline } from "./getSystemTimeline";

export interface HeroDemoData {
  system: {
    id: string;
    slug: string;
    name: string;
    website?: string | null;
    location?: string | null;
  };
  health?: {
    score: number;
    band: string;
  } | null;
  latestBriefing?: {
    id: string;
    createdAt: string;
    title: string;
    bullets: string[];
    narrative?: string | null;
  } | null;
  focusItems: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    when?: string | null;
  }>;
  timelineItems: Array<{
    id: string;
    type: string;
    occurredAt: string;
    title: string;
    description?: string | null;
  }>;
}

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  location: string | null;
};

type DailyBriefingRow = {
  id: string;
  system_id: string;
  created_at: string;
  summary: string;
};

export async function getHeroDemoData(
  supabase: SupabaseClient,
  systemSlug: string,
): Promise<HeroDemoData | null> {
  // 1. Resolve system
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name, website, location")
    .eq("slug", systemSlug)
    .maybeSingle<SystemRow>();

  if (systemError || !system) {
    return null;
  }

  // 2. Health score
  const healthScore = await getSingleSystemHealthScore(supabase, system.id);
  const health = healthScore
    ? {
        score: healthScore.overallScore,
        band: healthScore.band,
      }
    : null;

  // 3. Latest daily briefing
  const { data: briefings } = await supabase
    .from("daily_briefings")
    .select("id, system_id, created_at, summary")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<DailyBriefingRow[]>();

  let latestBriefing: HeroDemoData["latestBriefing"] | null = null;

  if (briefings && briefings.length > 0) {
    const briefing = briefings[0];
    try {
      const parsed = JSON.parse(briefing.summary) as {
        bullets?: string[];
        narrative?: string;
      };
      const bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];
      const narrative = typeof parsed.narrative === "string" ? parsed.narrative : null;
      const title = bullets.length > 0 ? bullets[0] : "Daily Briefing";

      latestBriefing = {
        id: briefing.id,
        createdAt: briefing.created_at,
        title,
        bullets,
        narrative,
      };
    } catch (parseError) {
      // If parsing fails, create a minimal briefing
      latestBriefing = {
        id: briefing.id,
        createdAt: briefing.created_at,
        title: "Daily Briefing",
        bullets: [],
        narrative: null,
      };
    }
  }

  // 4. Focus items limited to this system
  const todayFocus = await getTodayFocus(supabase, new Date());
  const focusItems = (todayFocus.items ?? [])
    .filter((i) => i.systemId === system.id)
    .slice(0, 5)
    .map((i) => ({
      id: `${i.type}-${i.id}`,
      type: i.type,
      title: i.title,
      description: i.description ?? null,
      when: i.when ?? null,
    }));

  // 5. Recent timeline
  const timeline = await getSystemTimeline(supabase, systemSlug, {
    daysBack: 30,
    limit: 50,
  });
  const timelineItems = (timeline?.items ?? [])
    .slice(-10)
    .map((item) => ({
      id: `${item.type}-${item.id}-${item.occurredAt}`,
      type: item.type,
      occurredAt: item.occurredAt,
      title: item.title,
      description: item.description ?? null,
    }));

  // 6. Return
  return {
    system: {
      id: system.id,
      slug: system.slug,
      name: system.name,
      website: system.website ?? null,
      location: system.location ?? null,
    },
    health,
    latestBriefing,
    focusItems,
    timelineItems,
  };
}

