import { notFound } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { OutboundPlaybookClient } from "@/components/OutboundPlaybookClient";

type SystemOutboundPlaybookPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SystemOutboundPlaybookPage({
  params,
}: SystemOutboundPlaybookPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data: system, error } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (error || !system) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Outbound Playbook – {system.name}</h1>
      <p>
        Generate persona-tailored talking points and outbound snippets for this
        account using HealthRecon intelligence.
      </p>
      <OutboundPlaybookClient systemSlug={system.slug} systemName={system.name} />
    </main>
  );
}

