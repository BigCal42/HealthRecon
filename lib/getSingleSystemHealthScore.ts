import type { SupabaseClient } from "@supabase/supabase-js";
import { getSystemHealthScores, type SystemHealthScore } from "./getSystemHealthScore";

export async function getSingleSystemHealthScore(
  supabase: SupabaseClient,
  systemId: string,
): Promise<SystemHealthScore | null> {
  const all = await getSystemHealthScores(supabase);
  return all.find((s) => s.systemId === systemId) ?? null;
}

