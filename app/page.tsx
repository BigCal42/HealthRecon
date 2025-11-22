import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getHomeFocus } from "@/lib/getHomeFocus";
import { getHomeTopSystems } from "@/lib/getHomeTopSystems";
import { getHomeHeroBriefing } from "@/lib/getHomeHeroBriefing";
import { PageShell } from "@/components/layout/PageShell";
import { Nav } from "@/components/layout/Nav";
import { SectionCard } from "@/components/layout/SectionCard";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "";
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

async function safeGetHomeFocus(supabase: ReturnType<typeof createServerSupabaseClient>) {
  try {
    return await getHomeFocus(supabase);
  } catch (error) {
    log("error", "Failed to load home focus items", { route: "/", error: error instanceof Error ? error : undefined });
    return [];
  }
}

async function safeGetHomeTopSystems(supabase: ReturnType<typeof createServerSupabaseClient>) {
  try {
    return await getHomeTopSystems(supabase);
  } catch (error) {
    log("error", "Failed to load home top systems", { route: "/", error: error instanceof Error ? error : undefined });
    return [];
  }
}

async function safeGetHomeHeroBriefing(supabase: ReturnType<typeof createServerSupabaseClient>) {
  try {
    return await getHomeHeroBriefing(supabase);
  } catch (error) {
    log("error", "Failed to load home hero briefing", { route: "/", error: error instanceof Error ? error : undefined });
    return null;
  }
}

export default async function HomePage() {
  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch (error) {
    log("error", "Failed to create Supabase client", { route: "/", error: error instanceof Error ? error : undefined });
    // Return error UI instead of throwing
    return (
      <PageShell>
        <h1>HealthRecon Operator Console</h1>
        <div className="mt-4 p-4 border border-red-500/50 rounded-lg bg-red-500/10">
          <h2 className="text-red-500 mb-2">Configuration Error</h2>
          <p className="text-muted-foreground">
            Unable to connect to the database. Please check your environment variables and ensure Supabase is configured correctly.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Check the Vercel deployment logs for more details.
          </p>
        </div>
      </PageShell>
    );
  }

  const [focusItems, topSystems, heroBriefing] = await Promise.all([
    safeGetHomeFocus(supabase),
    safeGetHomeTopSystems(supabase),
    safeGetHomeHeroBriefing(supabase),
  ]);

  return (
    <PageShell>
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">HealthRecon Operator Console</h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          Your health system intelligence and work queue.
        </p>
      </div>

      <Nav />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <SectionCard title="Quick Actions" description="Navigate to key pages">
          <div className="grid grid-cols-1 gap-3">
            {topSystems.length > 0 && (
              <Link
                href="/systems/bilh"
                className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
              >
                <div className="text-sm font-medium">BILH System</div>
                <div className="text-xs text-muted-foreground mt-0.5">View BILH overview</div>
              </Link>
            )}
            <Link
              href="/systems"
              className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
            >
              <div className="text-sm font-medium">Account Portfolio</div>
              <div className="text-xs text-muted-foreground mt-0.5">View all systems</div>
            </Link>
            <Link
              href="/compare"
              className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
            >
              <div className="text-sm font-medium">Compare Systems</div>
              <div className="text-xs text-muted-foreground mt-0.5">Side-by-side analysis</div>
            </Link>
          </div>
        </SectionCard>

        {/* Top Accounts */}
        <SectionCard title="Top Accounts" description="Your key health systems">
          {topSystems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No systems configured yet.{" "}
              <Link href="/systems/bilh" className="text-primary hover:underline transition-colors">
                Bootstrap BILH
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <>
              <ul className="space-y-2 divide-y divide-border/20">
                {topSystems.map((sys) => (
                  <li
                    key={sys.systemId}
                    className="pt-2 first:pt-0 first:border-0"
                  >
                    <Link
                      href={`/systems/${sys.slug}`}
                      className="text-sm font-medium hover:text-foreground transition-colors block"
                    >
                      {sys.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {sys.location && <span>{sys.location}</span>}
                      {typeof sys.openPipelineAmount === "number" && (
                        <span>• Open pipeline: {formatCurrency(sys.openPipelineAmount)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                <Link
                  href="/systems"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View full portfolio →
                </Link>
              </p>
            </>
          )}
        </SectionCard>

        {/* Today's Focus */}
        <SectionCard title="Today's Focus" description="Prioritized work items">
          {focusItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prioritized items for today.</p>
          ) : (
            <>
              <ul className="space-y-2 divide-y divide-border/20">
                {focusItems.map((item) => (
                  <li
                    key={item.id}
                    className="pt-2 first:pt-0 first:border-0"
                  >
                    <div className="flex items-start gap-2">
                      <Link
                        href={`/systems/${item.systemSlug}`}
                        className="text-sm font-medium hover:text-foreground transition-colors"
                      >
                        {item.systemName}
                      </Link>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.title}</p>
                    {item.when && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.when)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                <Link
                  href="/focus"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View full Focus view →
                </Link>
              </p>
            </>
          )}
        </SectionCard>

        {/* Latest Daily Briefing */}
        {heroBriefing && (
          <SectionCard title="Latest Daily Briefing" className="md:col-span-2">
            <div className="mb-3">
              <Link
                href={`/systems/${heroBriefing.systemSlug}`}
                className="text-sm font-medium hover:text-foreground transition-colors"
              >
                {heroBriefing.systemName}
              </Link>
              <span className="text-xs text-muted-foreground ml-2">
                — {formatDate(heroBriefing.created_at)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {heroBriefing.summary}
            </p>
          </SectionCard>
        )}

        {/* Strategy & Intelligence */}
        <SectionCard title="Strategy & Intelligence" description="Global views and tools" className="md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/strategy/global"
              className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
            >
              <div className="text-sm font-medium">Global Strategy Dashboard</div>
            </Link>
            <Link
              href="/insights"
              className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
            >
              <div className="text-sm font-medium">Global Insights</div>
            </Link>
            <Link
              href="/worklist"
              className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
            >
              <div className="text-sm font-medium">Worklist</div>
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-border/20 bg-muted/20 p-3 transition-all hover:bg-muted/40 hover:border-border/40 active:scale-95"
            >
              <div className="text-sm font-medium">Hero Demo</div>
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
