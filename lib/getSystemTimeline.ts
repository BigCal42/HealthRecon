import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";

export type TimelineItemType =
  | "signal"
  | "interaction"
  | "work_item"
  | "opportunity";

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  systemId: string;
  occurredAt: string; // ISO string
  title: string;
  description?: string | null;
  meta?: Record<string, any>;
}

export interface SystemTimeline {
  systemId: string;
  slug: string;
  name: string;
  items: TimelineItem[];
}

type SignalRow = {
  id: string;
  system_id: string;
  summary: string | null;
  category: string | null;
  severity: string | null;
  created_at: string;
};

type InteractionRow = {
  id: string;
  system_id: string;
  channel: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  next_step_due_at: string | null;
};

type WorkItemRow = {
  id: string;
  system_id: string;
  source_type: string;
  status: string;
  title: string;
  description: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: string;
  system_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getSystemTimeline(
  supabase: SupabaseClient,
  systemSlug: string,
  options?: {
    limit?: number; // total number of items
    daysBack?: number; // window, e.g. last 90 days
  }
): Promise<SystemTimeline | null> {
  // 1. Resolve system
  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", systemSlug)
    .maybeSingle();

  if (systemError || !system) {
    return null;
  }

  // 2. Time window
  const daysBack = options?.daysBack ?? 90;
  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  // 3. Fetch sources in parallel
  const [
    { data: signals, error: signalsError },
    { data: interactions, error: interactionsError },
    { data: workItems, error: workItemsError },
    { data: opportunities, error: opportunitiesError },
  ] = await Promise.all([
    supabase
      .from("signals")
      .select("id, system_id, summary, category, severity, created_at")
      .eq("system_id", system.id)
      .gte("created_at", startIso)
      .returns<SignalRow[]>(),
    supabase
      .from("interactions")
      .select("id, system_id, channel, subject, summary, occurred_at, next_step_due_at")
      .eq("system_id", system.id)
      .gte("occurred_at", startIso)
      .returns<InteractionRow[]>(),
    supabase
      .from("work_items")
      .select("id, system_id, source_type, status, title, description, due_at, created_at, updated_at")
      .eq("system_id", system.id)
      .gte("created_at", startIso)
      .returns<WorkItemRow[]>(),
    supabase
      .from("opportunities")
      .select("id, system_id, title, status, created_at, updated_at")
      .eq("system_id", system.id)
      .gte("created_at", startIso)
      .returns<OpportunityRow[]>(),
  ]);

  // Handle errors gracefully - log and proceed with partial data
  if (signalsError) {
    log("error", "Error fetching signals", { systemSlug, systemId: system.id, error: signalsError });
  }
  if (interactionsError) {
    log("error", "Error fetching interactions", { systemSlug, systemId: system.id, error: interactionsError });
  }
  if (workItemsError) {
    log("error", "Error fetching work items", { systemSlug, systemId: system.id, error: workItemsError });
  }
  if (opportunitiesError) {
    log("error", "Error fetching opportunities", { systemSlug, systemId: system.id, error: opportunitiesError });
  }

  // 4. Map to unified TimelineItem[]
  const signalItems: TimelineItem[] = (signals ?? []).map((s) => ({
    id: s.id,
    type: "signal",
    systemId: s.system_id,
    occurredAt: s.created_at,
    title: s.summary ?? s.category ?? "Signal",
    description: s.summary,
    meta: {
      category: s.category,
      severity: s.severity,
    },
  }));

  const interactionItems: TimelineItem[] = (interactions ?? []).map((ix) => ({
    id: ix.id,
    type: "interaction",
    systemId: ix.system_id,
    occurredAt: ix.occurred_at,
    title: ix.subject || ix.channel || "Interaction",
    description: ix.summary,
    meta: {
      channel: ix.channel,
      nextStepDueAt: ix.next_step_due_at,
    },
  }));

  const workItemItems: TimelineItem[] = (workItems ?? []).map((w) => ({
    id: w.id,
    type: "work_item",
    systemId: w.system_id,
    occurredAt: w.created_at, // or updated_at if you want latest movement
    title: w.title,
    description: w.description,
    meta: {
      status: w.status,
      sourceType: w.source_type,
      dueAt: w.due_at,
      updatedAt: w.updated_at,
    },
  }));

  const opportunityItems: TimelineItem[] = (opportunities ?? []).map((o) => ({
    id: o.id,
    type: "opportunity",
    systemId: o.system_id,
    occurredAt: o.updated_at ?? o.created_at,
    title: o.title,
    description: o.status,
    meta: {
      status: o.status,
    },
  }));

  // 5. Merge & sort
  const allItems = [
    ...signalItems,
    ...interactionItems,
    ...workItemItems,
    ...opportunityItems,
  ];

  allItems.sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0
  );

  // Apply limit (slice from end to show most recent)
  const limit = options?.limit ?? 200;
  const sliced = allItems.slice(-limit);

  // 6. Return
  return {
    systemId: system.id,
    slug: system.slug,
    name: system.name,
    items: sliced,
  };
}
