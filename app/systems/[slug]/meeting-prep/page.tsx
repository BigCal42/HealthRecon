import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { MeetingPrepClient } from "@/components/MeetingPrepClient";

type MeetingPrepPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function MeetingPrepPage({ params }: MeetingPrepPageProps) {
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
      <h1>Meeting Prep – {system.name}</h1>
      <p>Generate a structured prep brief for an upcoming meeting with this health system.</p>
      <MeetingPrepClient systemSlug={system.slug} systemName={system.name} />
    </main>
  );
}

