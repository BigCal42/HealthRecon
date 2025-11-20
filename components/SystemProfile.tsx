import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { SystemProfileClient } from "./SystemProfileClient";

interface SystemProfileProps {
  slug: string;
  systemId: string;
}

type SystemProfilePayload = {
  executive_summary: string;
  key_leadership: string[];
  strategic_priorities: string[];
  technology_landscape: string[];
  recent_signals: string[];
  opportunities_summary: string[];
  risk_factors: string[];
};

export async function SystemProfile({ slug, systemId }: SystemProfileProps) {
  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("system_profiles")
    .select("id, system_id, summary, created_at")
    .eq("system_id", systemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      system_id: string;
      summary: SystemProfilePayload;
      created_at: string;
    }>();

  return <SystemProfileClient slug={slug} initialProfile={profile} />;
}
