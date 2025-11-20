import { PageShell } from "@/components/layout/PageShell";

export default function Loading() {
  return (
    <PageShell>
      <h1>HealthRecon Operator Console</h1>
      <p className="text-muted-foreground mt-2 max-w-prose">
        Start here: what to look at and what to do across your health system
        accounts.
      </p>

      <div className="grid gap-8 mt-8">
        <section>
          <h2 className="mb-4">Today&apos;s Focus</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4">Top Accounts</h2>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4">Latest Daily Briefing</h2>
          <div className="border border-border/40 rounded-xl p-6 bg-muted/20">
            <div className="h-4 bg-muted/50 rounded w-1/3 mb-4 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 bg-muted/50 rounded w-full animate-pulse" />
              <div className="h-3 bg-muted/50 rounded w-5/6 animate-pulse" />
              <div className="h-3 bg-muted/50 rounded w-4/6 animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

