import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { AdminSystemSeedsClient } from "@/components/AdminSystemSeedsClient";

type SeedRow = {
  id: string;
  url: string;
  active: boolean;
  created_at: string | null;
};

type AdminSystemSeedsPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSystemSeedsPage({ params }: AdminSystemSeedsPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data: system, error: systemError } = await supabase
    .from("systems")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; name: string }>();

  if (systemError || !system) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>System not found</h1>
        <p>
          <Link href="/admin/systems">Back to Systems</Link>
        </p>
      </div>
    );
  }

  const { data: seeds } = await supabase
    .from("system_seeds")
    .select("id, url, active, created_at")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .returns<SeedRow[]>();

  const seedsList = seeds ?? [];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>System Seeds – {system.name}</h1>
      <p>
        <Link href="/admin/systems">Back to Systems</Link> |{" "}
        <Link href={`/systems/${system.slug}`}>View System</Link>
      </p>

      <h2>Existing Seeds</h2>
      {seedsList.length > 0 ? (
        <ul>
          {seedsList.map((seed) => (
            <li key={seed.id} style={{ marginBottom: "0.5rem" }}>
              <a href={seed.url} target="_blank" rel="noopener noreferrer">
                {seed.url}
              </a>{" "}
              {seed.active ? <span style={{ color: "green" }}>(active)</span> : <span style={{ color: "gray" }}>(inactive)</span>}
              {" – "}
              {seed.created_at
                ? new Date(seed.created_at).toLocaleString()
                : "Unknown"}
            </li>
          ))}
        </ul>
      ) : (
        <p>No seeds yet.</p>
      )}

      <h2>Add New Seed</h2>
      <AdminSystemSeedsClient
        slug={system.slug}
        initialSeeds={seedsList.map((seed) => ({
          id: seed.id,
          url: seed.url,
          active: seed.active,
          created_at: seed.created_at ?? new Date().toISOString(),
        }))}
      />
    </div>
  );
}

