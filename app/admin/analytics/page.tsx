import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { AnalyticsClient } from "@/components/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const supabase = createServerSupabaseClient();

  // Fetch initial analytics data server-side
  const { getAnalytics } = await import("@/lib/getAnalytics");
  const initialAnalytics = await getAnalytics(supabase);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Analytics Dashboard</h1>
      <p>
        <Link href="/admin/systems">Systems</Link> | <Link href="/admin/pipeline-status">Pipeline Status</Link> |{" "}
        <Link href="/">Home</Link>
      </p>

      <AnalyticsClient initialData={initialAnalytics} />
    </div>
  );
}

