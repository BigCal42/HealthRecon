import type { SupabaseClient } from "@supabase/supabase-js";

import type { TodayFocusItem } from "@/lib/getTodayFocus";

// WorkItemRow type - will match generated types after migration
type WorkItemRow = {
  id: string;
  system_id: string;
  source_type: string;
  source_id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkItemStatus = "open" | "snoozed" | "done" | "dropped";

export interface WorkItem {
  id: string;
  systemId: string;
  systemSlug: string;
  systemName: string;
  sourceType: WorkItemRow["source_type"];
  sourceId: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a work item from a TodayFocusItem.
 */
export async function createWorkItemFromFocus(
  supabase: SupabaseClient,
  focusItem: TodayFocusItem,
  options?: { defaultDueDays?: number },
): Promise<WorkItemRow> {
  let dueAt: string | null = null;
  if (options?.defaultDueDays !== undefined) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + options.defaultDueDays);
    dueAt = dueDate.toISOString();
  }

  const { data, error } = await supabase
    .from("work_items")
    .insert({
      system_id: focusItem.systemId,
      source_type: focusItem.type,
      source_id: focusItem.id,
      title: focusItem.title,
      description: focusItem.description ?? null,
      status: "open",
      due_at: dueAt,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create work item");
  }

  return data;
}

/**
 * Get work items with optional status filter.
 */
export async function getWorkItems(
  supabase: SupabaseClient,
  params?: { status?: WorkItemStatus },
): Promise<WorkItemRow[]> {
  let query = supabase
    .from("work_items")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Update work item status and optionally adjust due_at.
 */
export async function updateWorkItemStatus(
  supabase: SupabaseClient,
  id: string,
  status: WorkItemStatus,
  options?: { snoozeDays?: number },
): Promise<WorkItemRow | null> {
  const updateData: {
    status: WorkItemStatus;
    due_at: string | null;
    updated_at: string;
  } = {
    status,
    due_at: null,
    updated_at: new Date().toISOString(),
  };

  // Compute new due_at based on status
  if (status === "snoozed" && options?.snoozeDays !== undefined) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + options.snoozeDays);
    updateData.due_at = dueDate.toISOString();
  } else if (status === "done" || status === "dropped") {
    updateData.due_at = null;
  }

  const { data, error } = await supabase
    .from("work_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

