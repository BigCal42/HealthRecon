import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { AdminSystemsClient } from "@/components/AdminSystemsClient";

type AdminSystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
};

export default async function AdminSystemsPage() {
  const supabase = createServerSupabaseClient();

  const { data: systems } = await supabase
    .from("systems")
    .select("id, slug, name, website, hq_city, hq_state")
    .order("name", { ascending: true })
    .returns<AdminSystemRow[]>();

  const systemsList = systems ?? [];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>System Admin</h1>
      <p>
        <Link href="/">Home</Link> | <Link href="/dashboard">Dashboard</Link>
      </p>

      <h2>Systems</h2>
      {systemsList.length > 0 ? (
        <ul>
          {systemsList.map((system) => (
            <li key={system.id} style={{ marginBottom: "0.5rem" }}>
              <Link href={`/admin/systems/${system.slug}`}>
                <strong>{system.name}</strong>
              </Link>{" "}
              ({system.slug})
              {system.website && (
                <>
                  {" – "}
                  <a href={system.website} target="_blank" rel="noopener noreferrer">
                    {system.website}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No systems yet.</p>
      )}

      <h2>Add New System</h2>
      <AdminSystemsClient
        initialSystems={systemsList.map((system) => ({
          id: system.id,
          slug: system.slug,
          name: system.name,
          website: system.website ?? undefined,
        }))}
      />
    </div>
  );
}

