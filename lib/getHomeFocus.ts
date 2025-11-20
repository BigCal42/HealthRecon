import type { SupabaseClient } from "@supabase/supabase-js";

import { getTodayFocus } from "./getTodayFocus";

export interface HomeFocusItem {
  id: string;
  type: "interaction" | "opportunity" | "signal_action" | "system";
  title: string;
  systemSlug: string;
  systemName: string;
  when: string | null;
}

export async function getHomeFocus(
  supabase: SupabaseClient,
): Promise<HomeFocusItem[]> {
  // Get today's focus items
  const focus = await getTodayFocus(supabase, new Date());

  // Map to simplified format and take top 5
  return focus.items.slice(0, 5).map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    systemSlug: item.systemSlug,
    systemName: item.systemName,
    when: item.when ?? null,
  }));
}

