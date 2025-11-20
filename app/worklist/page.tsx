import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getWorkItems } from "@/lib/worklist";
import { WorklistClient } from "@/components/WorklistClient";

export const dynamic = "force-dynamic";

export default async function WorklistPage() {
  const supabase = createServerSupabaseClient();
  const rows = await getWorkItems(supabase, { status: "open" });

  // Fetch systems to get slug and name
  const systemIds = [...new Set(rows.map((row) => row.system_id))];
  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name")
    .in("id", systemIds);

  const systemMap = new Map<string, { slug: string; name: string }>();
  (systems ?? []).forEach((system) => {
    systemMap.set(system.id, { slug: system.slug, name: system.name });
  });

  // Map work items with system info
  const items = rows.map((row) => {
    const system = systemMap.get(row.system_id);
    return {
      id: row.id,
      systemSlug: system?.slug ?? "",
      systemName: system?.name ?? "",
      title: row.title,
      description: row.description,
      status: row.status,
      dueAt: row.due_at,
    };
  });

  return (
    <main style={{ padding: "2rem" }}>
      <WorklistClient initialItems={items} />
    </main>
  );
}
