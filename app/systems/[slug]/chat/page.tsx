import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { SystemChatClient } from "@/components/SystemChatClient";

type SystemChatPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function SystemChatPage({ params }: SystemChatPageProps) {
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
      <h1>Chat – {system.name}</h1>
      <p>Ask questions about this health system using its latest intelligence.</p>
      <SystemChatClient systemSlug={system.slug} systemName={system.name} />
    </main>
  );
}

