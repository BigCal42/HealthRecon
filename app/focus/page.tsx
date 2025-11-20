import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getTodayFocus } from "@/lib/getTodayFocus";
import { FocusClient } from "@/components/FocusClient";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const supabase = createServerSupabaseClient();
  const today = new Date();
  const focus = await getTodayFocus(supabase, today);

  return (
    <main style={{ padding: "2rem" }}>
      <FocusClient initialFocus={focus} />
    </main>
  );
}

