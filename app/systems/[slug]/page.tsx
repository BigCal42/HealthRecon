import { BILH_SLUG } from "@/config/constants";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

export default async function SystemPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const supabase = createServerSupabaseClient();

  const { data: system, error } = await supabase
    .from("systems")
    .select("id, slug, name, website, hq_city, hq_state")
    .eq("slug", slug)
    .maybeSingle<SystemRow>();

  if (error || !system) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>System not found</h1>
        <p>
          {error
            ? "Unable to load system data."
            : `The system "${slug}" does not exist.`}
        </p>
        <p style={{ color: "#666" }}>
          Currently only the {BILH_SLUG.toUpperCase()} system is seeded.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{system.name}</h1>
      {system.website && (
        <p>
          <a href={system.website} target="_blank" rel="noopener noreferrer">
            {system.website}
          </a>
        </p>
      )}

      <section style={{ marginTop: "2rem" }}>
        <h2>Signals</h2>
        <p style={{ color: "#666" }}>No signals yet</p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Entities</h2>
        <p style={{ color: "#666" }}>No entities yet</p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Documents</h2>
        <p style={{ color: "#666" }}>No documents yet</p>
      </section>
    </div>
  );
}

