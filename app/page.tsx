import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type HomeSystemRow = {
  slug: string;
  name: string;
  website: string | null;
};

export default async function Home() {
  const supabase = createServerSupabaseClient();

  const { data: systems } = await supabase
    .from("systems")
    .select("slug, name, website")
    .order("name", { ascending: true })
    .returns<HomeSystemRow[]>();

  const systemsList = systems ?? [];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>HealthRecon</h1>
      <p>Personal intelligence layer for healthcare systems.</p>
      <p>
        <Link href="/worklist">Worklist</Link> |{" "}
        <Link href="/dashboard">View Systems Dashboard</Link> |{" "}
        <Link href="/targets">View System Targeting</Link> |{" "}
        <Link href="/search">Global Search</Link> |{" "}
        <Link href="/sales-briefing">Daily Sales Briefing</Link> |{" "}
        <Link href="/health-scores">System Health Scores</Link> |{" "}
        <Link href="/compare">Compare Systems</Link> |{" "}
        <Link href="/admin/systems">Admin: Manage Systems</Link>
      </p>

      <h2>Systems</h2>
      <ul>
        {systemsList.length > 0 ? (
          systemsList.map((system) => (
            <li key={system.slug}>
              <Link href={`/systems/${system.slug}`}>{system.name}</Link>
              {system.website ? (
                <>
                  {" – "}
                  <a href={system.website} target="_blank" rel="noopener noreferrer">
                    {system.website}
                  </a>
                </>
              ) : null}
            </li>
          ))
        ) : (
          <li>No systems yet.</li>
        )}
      </ul>
    </div>
  );
}

