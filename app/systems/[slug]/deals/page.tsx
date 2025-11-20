import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemOpportunities } from "@/lib/getSystemOpportunities";
import { OpportunityBoardClient } from "@/components/OpportunityBoardClient";
import { UICopy } from "@/lib/uiCopy";

export default async function SystemDealsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();
  const buckets = await getSystemOpportunities(supabase, slug);

  if (!buckets) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{UICopy.deals.pageTitlePrefix}{buckets.systemName}</h1>
      <p>
        A simple pipeline view by stage for this account&apos;s active and closed deals.
      </p>
      <OpportunityBoardClient buckets={buckets} />
    </main>
  );
}

