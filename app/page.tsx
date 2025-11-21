import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getHomeFocus } from "@/lib/getHomeFocus";
import { getHomeTopSystems } from "@/lib/getHomeTopSystems";
import { getHomeHeroBriefing } from "@/lib/getHomeHeroBriefing";
import { PageShell } from "@/components/layout/PageShell";
import { Nav } from "@/components/layout/Nav";
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
      <h1>HealthRecon Operator Console</h1>
      <p className="text-muted-foreground mt-2 max-w-prose">
        Start here: what to look at and what to do across your health system
        accounts.
      </p>

      <Nav />

      <div className="grid gap-8">
        <section>
          <h2 className="mb-4">Today&apos;s Focus</h2>
          {focusItems.length === 0 ? (
            <p className="text-muted-foreground">No prioritized items for today.</p>
          ) : (
            <ul className="space-y-2">
              {focusItems.map((item) => (
                <li key={item.id} className="hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2">
                  <Link
                    href={`/systems/${item.systemSlug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.systemName}
                  </Link>{" "}
                  – <span className="text-muted-foreground">[{item.type}]</span> {item.title}
                  {item.when && (
                    <span className="text-muted-foreground"> — {formatDate(item.when)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4">
            <Link
              href="/focus"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              View full Focus view
            </Link>
          </p>
        </section>

        <section>
          <h2 className="mb-4">Top Accounts</h2>
          {topSystems.length === 0 ? (
            <p className="text-muted-foreground">No systems configured yet.</p>
          ) : (
            <ul className="space-y-2">
              {topSystems.map((sys) => (
                <li key={sys.systemId} className="hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2">
                  <Link
                    href={`/systems/${sys.slug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {sys.name}
                  </Link>
                  {sys.location && (
                    <span className="text-muted-foreground"> — {sys.location}</span>
                  )}
                  {typeof sys.openPipelineAmount === "number" && (
                    <span className="text-muted-foreground">
                      {" "}
                      — Open pipeline: {formatCurrency(sys.openPipelineAmount)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4">
            <Link
              href="/systems"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              View full portfolio
            </Link>
          </p>
        </section>

        {heroBriefing && (
          <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
            <h2 className="mb-4">Latest Daily Briefing</h2>
            <p className="mb-2">
              <strong>
                <Link
                  href={`/systems/${heroBriefing.systemSlug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {heroBriefing.systemName}
                </Link>
              </strong>{" "}
              <span className="text-muted-foreground">— {formatDate(heroBriefing.created_at)}</span>
            </p>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {heroBriefing.summary}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-4">Strategy & Intelligence</h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/strategy/global"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Global Strategy Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/insights"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Global Insights
              </Link>
            </li>
            <li>
              <Link
                href="/worklist"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Worklist
              </Link>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Hero Demo
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
