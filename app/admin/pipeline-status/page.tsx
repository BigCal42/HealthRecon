import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { PipelineStatusClient } from "@/components/PipelineStatusClient";

export const dynamic = "force-dynamic";

type PipelineRunRow = {
  id: string;
  system_id: string | null;
  status: string;
  ingest_created: number | null;
  process_processed: number | null;
  error_message: string | null;
  created_at: string;
};

type DailyBriefingRunRow = {
  id: string;
  system_id: string;
  status: string;
  briefing_id: string | null;
  error_message: string | null;
  created_at: string;
};

export default async function AdminPipelineStatusPage() {
  const supabase = createServerSupabaseClient();

  // Get recent pipeline runs
  const { data: pipelineRuns } = await supabase
    .from("pipeline_runs")
    .select("id, system_id, status, ingest_created, process_processed, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PipelineRunRow[]>();

  // Get recent briefing runs
  const { data: briefingRuns } = await supabase
    .from("daily_briefing_runs")
    .select("id, system_id, status, briefing_id, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<DailyBriefingRunRow[]>();

  // Get system names for display
  const systemIds = new Set<string>();
  pipelineRuns?.forEach((r) => {
    if (r.system_id) systemIds.add(r.system_id);
  });
  briefingRuns?.forEach((r) => {
    systemIds.add(r.system_id);
  });

  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name")
    .in("id", Array.from(systemIds))
    .returns<Array<{ id: string; slug: string; name: string }>>();

  const systemMap = new Map(systems?.map((s) => [s.id, s]) ?? []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Pipeline Status</h1>
      <p>
        <Link href="/admin/analytics">Analytics</Link> | <Link href="/admin/systems">Systems</Link> |{" "}
        <Link href="/">Home</Link>
      </p>

      <PipelineStatusClient
        initialPipelineRuns={pipelineRuns ?? []}
        initialBriefingRuns={briefingRuns ?? []}
        systemMap={Object.fromEntries(systemMap)}
      />
    </div>
  );
}

