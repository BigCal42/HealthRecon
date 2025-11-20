import { notFound } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemIngestionConfig } from "@/lib/getSystemIngestionConfig";
import { SystemIngestionClient } from "@/components/SystemIngestionClient";

export const dynamic = "force-dynamic";

export default async function SystemIngestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();
  const config = await getSystemIngestionConfig(supabase, slug);

  if (!config) {
    notFound();
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Ingestion – {config.name}</h1>
      <p>Manage Firecrawl seed URLs and ingestion settings for this account.</p>
      <SystemIngestionClient config={config} />
    </div>
  );
}

