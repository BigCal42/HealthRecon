import { notFound } from "next/navigation";

import { getAccountPlanView } from "@/lib/accountPlan";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { AccountPlanClient } from "@/components/AccountPlanClient";
import { PageShell } from "@/components/layout/PageShell";

type AccountPlanPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function AccountPlanPage({ params }: AccountPlanPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const view = await getAccountPlanView(supabase, slug);

  if (!view) {
    notFound();
  }

  return (
    <PageShell>
      <h1>Account Plan – {view.systemName}</h1>
      <p className="text-muted-foreground mt-2 max-w-prose">
        Maintain a concise account strategy for this health system.
      </p>
      <AccountPlanClient initialData={view} />
    </PageShell>
  );
}

