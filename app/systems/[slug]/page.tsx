import { BILH_SLUG } from "@/config/constants";
import { groupBy } from "@/lib/groupBy";
import { logger } from "@/lib/logger";
import type { EntityType } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { UICopy } from "@/lib/uiCopy";
import Link from "next/link";
import { SystemActions } from "@/components/SystemActions";
import { SystemInteractions } from "@/components/SystemInteractions";
import { SystemOpportunities } from "@/components/SystemOpportunities";
import { SystemOpportunitySuggestions } from "@/components/SystemOpportunitySuggestions";
import { SystemOutboundComposer } from "@/components/SystemOutboundComposer";
import { SystemOutboundPrep } from "@/components/SystemOutboundPrep";
import { SystemProfile } from "@/components/SystemProfile";
import { SystemContacts } from "@/components/SystemContacts";
import { SystemTimeline } from "@/components/SystemTimeline";
import { SystemSignalActions } from "@/components/SystemSignalActions";
import { SystemNarrative } from "@/components/SystemNarrative";
import { getSingleSystemHealthScore } from "@/lib/getSingleSystemHealthScore";
import { PageShell } from "@/components/layout/PageShell";

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
};

type DocumentRow = {
  id: string;
  title: string | null;
  source_url: string;
  crawled_at: string | null;
};

type EntityRow = {
  id: string;
  type: EntityType;
  name: string;
  role: string | null;
};

type SignalRow = {
  id: string;
  severity: string | null;
  category: string | null;
  summary: string | null;
  created_at: string | null;
  documents?:
    | { source_url: string | null }
    | { source_url: string | null }[]
    | null;
};

type DailyBriefingRow = {
  id: string;
  summary: string;
  created_at: string | null;
};

type PipelineRunRow = {
  id: string;
  status: string;
  ingest_created: number;
  process_processed: number;
  error_message: string | null;
  created_at: string | null;
};

type DailyBriefingRunRow = {
  id: string;
  status: string;
  briefing_id: string | null;
  error_message: string | null;
  created_at: string | null;
};

type FeedbackRow = {
  id: string;
  kind: string;
  target_id: string | null;
  sentiment: string;
  comment: string | null;
  created_at: string | null;
};

const ENTITY_SECTIONS: { heading: string; key: EntityType }[] = [
  { heading: "People", key: "person" },
  { heading: "Facilities", key: "facility" },
  { heading: "Initiatives", key: "initiative" },
  { heading: "Vendors", key: "vendor" },
  { heading: "Technologies", key: "technology" },
];

type SystemPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const dynamic = "force-dynamic";

export default async function SystemPage({ params, searchParams }: SystemPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = createServerSupabaseClient();

  const docPage = Number(resolvedSearchParams.documents_page ?? "1") || 1;
  const sigPage = Number(resolvedSearchParams.signals_page ?? "1") || 1;
  const pageSize = 20;

  const { data: system, error } = await supabase
    .from("systems")
    .select("id, slug, name, website")
    .eq("slug", slug)
    .maybeSingle<SystemRow>();

  if (error || !system) {
    return (
      <PageShell>
        <h1>System not found</h1>
        <p>
          {error
            ? "Unable to load system data."
            : `The system "${slug}" does not exist.`}
        </p>
        <p className="text-muted-foreground">
          Currently only the {BILH_SLUG.toUpperCase()} system is seeded.
        </p>
      </PageShell>
    );
  }

  const health = await getSingleSystemHealthScore(supabase, system.id);

  const { data: briefing } = await supabase
    .from("daily_briefings")
    .select("id, summary, created_at")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DailyBriefingRow>();

  const [
    { data: documentsData, count: documentsTotal },
    { data: entitiesData },
    { data: signalsData, count: signalsTotal },
    { data: newsData },
    { data: pipelineRunsData },
    { data: briefingRunsData },
    { data: feedbackData },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, source_url, crawled_at", { count: "exact" })
      .eq("system_id", system.id)
      .order("crawled_at", { ascending: false })
      .range((docPage - 1) * pageSize, docPage * pageSize - 1),
    supabase
      .from("entities")
      .select("id, type, name, role")
      .eq("system_id", system.id),
    supabase
      .from("signals")
      .select("id, severity, category, summary, created_at, documents(source_url)", { count: "exact" })
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .range((sigPage - 1) * pageSize, sigPage * pageSize - 1),
    supabase
      .from("documents")
      .select("id, title, source_url, crawled_at")
      .eq("system_id", system.id)
      .eq("source_type", "news")
      .order("crawled_at", { ascending: false })
      .limit(20),
    supabase
      .from("pipeline_runs")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("daily_briefing_runs")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("feedback")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const documents = (documentsData ?? []) as DocumentRow[];
  const entities = (entitiesData ?? []) as EntityRow[];
  const signals = (signalsData ?? []) as SignalRow[];
  const news = (newsData ?? []) as DocumentRow[];
  const pipelineRuns = (pipelineRunsData ?? []) as PipelineRunRow[];
  const briefingRuns = (briefingRunsData ?? []) as DailyBriefingRunRow[];
  const feedback = (feedbackData ?? []) as FeedbackRow[];

  let parsedBriefing: { bullets?: unknown; narrative?: unknown } | null = null;

  if (briefing?.summary) {
    try {
      parsedBriefing = JSON.parse(briefing.summary) as {
        bullets?: unknown;
        narrative?: unknown;
      };
    } catch (parseError) {
      logger.error(parseError, "Failed to parse daily briefing summary");
    }
  }

  const briefingBullets = Array.isArray(parsedBriefing?.bullets)
    ? (parsedBriefing?.bullets as string[])
    : null;
  const briefingNarrative =
    typeof parsedBriefing?.narrative === "string"
      ? (parsedBriefing.narrative as string)
      : null;

  const groupedEntities = groupBy(entities, (entity) => entity.type);
  const hasEntities = entities.length > 0;

  // Compute System Overview metrics
  const documentCount = documentsTotal ?? 0;
  const entityCount = entities.length;
  const signalCount = signalsTotal ?? 0;
  const lastDocumentAt =
    documents.length > 0 && documents[0].crawled_at
      ? new Date(documents[0].crawled_at).toISOString()
      : null;
  const lastSignalAt =
    signals.length > 0 && signals[0].created_at
      ? new Date(signals[0].created_at).toISOString()
      : null;
  const lastBriefingAt = briefing?.created_at
    ? new Date(briefing.created_at).toISOString()
    : null;

  return (
    <PageShell>
      <h1>{UICopy.systemSections.overview} – {system.name}</h1>
      {system.website && (
        <p className="mt-2">
          <a
            href={system.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {system.website}
          </a>
        </p>
      )}
      <nav className="mt-6 mb-8">
        <ul className="flex flex-wrap gap-4 list-none p-0">
          <li>
            <Link
              href={`/systems/${system.slug}/timeline`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {UICopy.systemSections.timeline}
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/deals`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {UICopy.systemSections.deals}
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/insights`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {UICopy.systemSections.insights}
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/outbound-playbook`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Outbound Playbook
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/strategy`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Strategy Briefing
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/meeting-prep`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Meeting Prep
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/account-plan`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Account Plan
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/opportunities`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Opportunities
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/chat`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Chat
            </Link>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/ingestion`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Ingestion
            </Link>
          </li>
          <li>
            <Link
              href={`/demo?slug=${system.slug}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {UICopy.nav.heroDemo}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="grid gap-8">
        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">System Health</h2>
          {health ? (
            <div>
              <p className="mb-2">
                <strong>Band:</strong> {health.band} |{" "}
                <strong>Score:</strong> {health.overallScore}
              </p>
              <p className="mb-2">Components:</p>
              <ul className="list-disc list-inside mb-4">
                <li>Engagement: {health.components.engagementScore}</li>
                <li>Opportunities: {health.components.opportunityScore}</li>
                <li>Signals: {health.components.signalScore}</li>
                <li>Risk: {health.components.riskScore}</li>
              </ul>
              {health.reasons.length > 0 && (
                <>
                  <p className="mb-2">Why:</p>
                  <ul className="list-disc list-inside">
                    {health.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No health score available.</p>
          )}
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">System Overview</h2>
          <ul className="space-y-1">
            <li>Total documents: {documentCount}</li>
            <li>Total entities: {entityCount}</li>
            <li>Total signals: {signalCount}</li>
            <li>Last document: {lastDocumentAt ?? "N/A"}</li>
            <li>Last signal: {lastSignalAt ?? "N/A"}</li>
            <li>Last briefing: {lastBriefingAt ?? "N/A"}</li>
          </ul>
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">System Profile</h2>
          <SystemProfile slug={system.slug} systemId={system.id} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Account Plan</h2>
          <p>
            <Link
              href={`/systems/${system.slug}/account-plan`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Open Account Plan workspace
            </Link>
          </p>
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Living System Narrative</h2>
          <SystemNarrative slug={system.slug} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Key Contacts & Buying Committee</h2>
          <SystemContacts slug={system.slug} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Outbound Prep & Playbook</h2>
          <SystemOutboundPrep slug={system.slug} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Outbound Draft Composer</h2>
          <SystemOutboundComposer slug={system.slug} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">News</h2>
          {news.length === 0 ? (
            <p className="text-muted-foreground">No news yet.</p>
          ) : (
            <ul className="space-y-2">
              {news.map((n) => (
                <li key={n.id} className="hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2">
                  <a
                    href={n.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {n.title ?? "Untitled"}
                  </a>{" "}
                  <span className="text-muted-foreground">
                    – {n.crawled_at ? new Date(n.crawled_at).toLocaleString() : "Unknown"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SystemActions slug={system.slug} />

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Suggested Opportunities</h2>
          <SystemOpportunitySuggestions slug={system.slug} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Opportunities</h2>
          <SystemOpportunities slug={system.slug} />
        </section>

        <SystemTimeline systemSlug={system.slug} />

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Interaction Log</h2>
          <SystemInteractions slug={system.slug} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Run History</h2>
          <h3 className="mb-3">Pipeline Runs</h3>
          {pipelineRuns && pipelineRuns.length > 0 ? (
            <ul className="space-y-2 mb-6">
              {pipelineRuns.map((run) => (
                <li key={run.id} className="text-sm">
                  <span className="text-muted-foreground">
                    [{run.created_at ? new Date(run.created_at).toLocaleString() : "Unknown"}]
                  </span>{" "}
                  {run.status} – ingest: {run.ingest_created}, process: {run.process_processed}
                  {run.error_message && (
                    <span className="text-muted-foreground"> – Error: {run.error_message}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mb-6">No pipeline runs yet.</p>
          )}
          <h3 className="mb-3">Daily Briefing Runs</h3>
          {briefingRuns && briefingRuns.length > 0 ? (
            <ul className="space-y-2">
              {briefingRuns.map((run) => (
                <li key={run.id} className="text-sm">
                  <span className="text-muted-foreground">
                    [{run.created_at ? new Date(run.created_at).toLocaleString() : "Unknown"}]
                  </span>{" "}
                  {run.status}
                  {run.error_message && (
                    <span className="text-muted-foreground"> – Error: {run.error_message}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No daily briefing runs yet.</p>
          )}
        </section>

        {briefingBullets && briefingNarrative && (
          <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
            <h2 className="mb-4">Daily Briefing</h2>
            <ul className="space-y-2 mb-4">
              {briefingBullets.map((bullet, index) => (
                <li key={`${index}-${bullet}`}>{bullet}</li>
              ))}
            </ul>
            <p className="text-muted-foreground leading-relaxed">{briefingNarrative}</p>
          </section>
        )}

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">{UICopy.systemSections.signals}</h2>
          {signals.length === 0 ? (
            <p className="text-muted-foreground">No signals yet</p>
          ) : (
            <>
              <ul className="space-y-4">
                {signals.map((signal) => {
                  const documentRelation = Array.isArray(signal.documents)
                    ? signal.documents[0]
                    : signal.documents;
                  const documentUrl = documentRelation?.source_url ?? null;

                  return (
                    <li key={signal.id} className="border-b border-border/20 pb-4 last:border-0">
                      <p className="mb-1">
                        <strong>Severity:</strong> {signal.severity ?? "Unknown"}
                      </p>
                      <p className="mb-1">
                        <strong>Category:</strong> {signal.category ?? "Unknown"}
                      </p>
                      <p className="mb-2">{signal.summary ?? "No summary provided."}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Created: {signal.created_at ?? "Unknown"}
                      </p>
                      {documentUrl ? (
                        <p>
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                          >
                            Source document
                          </a>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No source document available.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {(() => {
                const signalsTotalPages = Math.max(1, Math.ceil((signalsTotal ?? 0) / pageSize));
                return (
                  <div className="mt-6 flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Page {sigPage} of {signalsTotalPages}
                    </p>
                    <div className="flex gap-2">
                      {sigPage > 1 && (
                        <Link
                          href={`?signals_page=${sigPage - 1}&documents_page=${docPage}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Previous
                        </Link>
                      )}
                      {sigPage < signalsTotalPages && (
                        <Link
                          href={`?signals_page=${sigPage + 1}&documents_page=${docPage}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Next
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Signal-Based Actions</h2>
          <SystemSignalActions slug={system.slug} signals={signals} />
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Entities</h2>
          {!hasEntities ? (
            <p className="text-muted-foreground">No entities yet</p>
          ) : (
            <div className="space-y-6">
              {ENTITY_SECTIONS.map((section) => {
                const sectionEntities = groupedEntities[section.key] ?? [];

                return (
                  <div key={section.key}>
                    <h3 className="mb-2">{section.heading}</h3>
                    {sectionEntities.length === 0 ? (
                      <p className="text-muted-foreground">No {section.heading.toLowerCase()} found.</p>
                    ) : (
                      <ul className="space-y-1">
                        {sectionEntities.map((entity) => (
                          <li key={entity.id}>
                            <span>{entity.name}</span>
                            {entity.role && (
                              <span className="text-muted-foreground"> — {entity.role}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">{UICopy.systemSections.documents}</h2>
          {documents.length === 0 ? (
            <p className="text-muted-foreground">No documents yet</p>
          ) : (
            <>
              <ul className="space-y-4">
                {documents.map((document) => (
                  <li key={document.id} className="border-b border-border/20 pb-4 last:border-0">
                    <p className="mb-2">{document.title ?? "Untitled"}</p>
                    <p className="mb-2">
                      <a
                        href={document.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors text-sm break-all"
                      >
                        {document.source_url}
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Crawled: {document.crawled_at ?? "Unknown"}
                    </p>
                  </li>
                ))}
              </ul>
              {(() => {
                const documentsTotalPages = Math.max(1, Math.ceil((documentsTotal ?? 0) / pageSize));
                return (
                  <div className="mt-6 flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Page {docPage} of {documentsTotalPages}
                    </p>
                    <div className="flex gap-2">
                      {docPage > 1 && (
                        <Link
                          href={`?documents_page=${docPage - 1}&signals_page=${sigPage}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Previous
                        </Link>
                      )}
                      {docPage < documentsTotalPages && (
                        <Link
                          href={`?documents_page=${docPage + 1}&signals_page=${sigPage}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Next
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </section>

        <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
          <h2 className="mb-4">Recent Feedback</h2>
          {feedback && feedback.length > 0 ? (
            <ul className="space-y-2">
              {feedback.map((f) => (
                <li key={f.id} className="text-sm">
                  <span className="text-muted-foreground">
                    [{f.created_at ? new Date(f.created_at).toLocaleString() : "Unknown"}]
                  </span>{" "}
                  {f.kind} – {f.sentiment}
                  {f.comment && <span className="text-muted-foreground"> – {f.comment}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No feedback yet.</p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
