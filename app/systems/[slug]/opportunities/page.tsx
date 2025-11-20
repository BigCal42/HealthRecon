import { notFound } from "next/navigation";

import { getOpportunityWorkspaceView } from "@/lib/opportunities";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { OpportunitiesClient } from "@/components/OpportunitiesClient";

type OpportunitiesPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ params }: OpportunitiesPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const view = await getOpportunityWorkspaceView(supabase, slug);

  if (!view) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Opportunities – {view.systemName}</h1>
      <p>Unified view of opportunities, suggestions, signals, and interactions for this health system.</p>
      <OpportunitiesClient initialData={view} />
    </main>
  );
}

