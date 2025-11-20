import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { StrategyBriefingClient } from "@/components/StrategyBriefingClient";

type StrategyPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data: system } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (!system) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Strategy Briefing – {system.name}</h1>
      <p>Generate a strategic, 6–12 month executive analysis for this account.</p>
      <StrategyBriefingClient systemSlug={system.slug} systemName={system.name} />
    </main>
  );
}

