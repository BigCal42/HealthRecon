import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { CompareClient } from "@/components/CompareClient";

export default async function ComparePage() {
  const supabase = createServerSupabaseClient();

  const { data: systems } = await supabase
    .from("systems")
    .select("slug, name")
    .order("name", { ascending: true });

  if (!systems || systems.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Compare Systems</h1>
        <p>No systems available for comparison.</p>
      </div>
    );
  }

  return <CompareClient systems={systems} />;
}

