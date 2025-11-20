import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemPortfolio } from "@/lib/getSystemPortfolio";
import { PageShell } from "@/components/layout/PageShell";
import { Nav } from "@/components/layout/Nav";

export const dynamic = "force-dynamic";

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "Never";
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return "Never";
  }
}

function formatLocation(
  hqCity: string | null | undefined,
  hqState: string | null | undefined,
): string | null {
  if (!hqCity && !hqState) {
    return null;
  }
  const parts = [hqCity, hqState].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export default async function SystemsPortfolioPage() {
  const supabase = createServerSupabaseClient();
  const portfolio = await getSystemPortfolio(supabase);

  return (
    <PageShell>
      <h1>Account Portfolio</h1>
      <p className="text-muted-foreground mt-2 max-w-prose">
        All tracked health systems, with ingestion status and quick links into
        account views.
      </p>

      <Nav />

      {portfolio.items.length === 0 ? (
        <p className="text-muted-foreground">No systems configured. Add systems directly in Supabase for now.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 border-b border-border/40 font-medium">
                  Account
                </th>
                <th className="text-left py-3 px-4 border-b border-border/40 font-medium">
                  Seeds
                </th>
                <th className="text-left py-3 px-4 border-b border-border/40 font-medium">
                  Docs
                </th>
                <th className="text-left py-3 px-4 border-b border-border/40 font-medium">
                  Last Ingestion
                </th>
                <th className="text-left py-3 px-4 border-b border-border/40 font-medium">
                  Views
                </th>
                <th className="text-left py-3 px-4 border-b border-border/40 font-medium">
                  Ingestion
                </th>
              </tr>
            </thead>
            <tbody>
              {portfolio.items.map((item) => {
                const location = formatLocation(item.hqCity, item.hqState);
                return (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 border-b border-border/20">
                      <div>
                        <Link
                          href={`/systems/${item.slug}`}
                          className="hover:text-foreground transition-colors"
                        >
                          {item.name}
                        </Link>
                      </div>
                      {location && (
                        <div className="text-sm text-muted-foreground">{location}</div>
                      )}
                      {item.website && (
                        <div className="text-sm">
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {item.website}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 border-b border-border/20">
                      {item.activeSeedCount}/{item.seedCount} active
                    </td>
                    <td className="py-3 px-4 border-b border-border/20">
                      {item.documentCount}
                    </td>
                    <td className="py-3 px-4 border-b border-border/20">
                      {formatDate(item.lastIngestedAt)}
                    </td>
                    <td className="py-3 px-4 border-b border-border/20">
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Link
                          href={`/systems/${item.slug}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Overview
                        </Link>
                        <span className="text-muted-foreground">|</span>
                        <Link
                          href={`/systems/${item.slug}/insights`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Insights
                        </Link>
                        <span className="text-muted-foreground">|</span>
                        <Link
                          href={`/systems/${item.slug}/deals`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Deals
                        </Link>
                        <span className="text-muted-foreground">|</span>
                        <Link
                          href={`/systems/${item.slug}/timeline`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Timeline
                        </Link>
                        <span className="text-muted-foreground">|</span>
                        <Link
                          href={`/demo?slug=${item.slug}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Demo
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-b border-border/20">
                      <Link
                        href={`/systems/${item.slug}/ingestion`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Ingestion
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
