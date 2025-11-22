import { BILH_SLUG } from "@/config/constants";
import { groupBy } from "@/lib/groupBy";
import { logger } from "@/lib/logger";
import type { EntityType } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { UICopy } from "@/lib/uiCopy";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { PipelineSection } from "@/components/PipelineSection";
import { getSingleSystemHealthScore } from "@/lib/getSingleSystemHealthScore";
import { PageShell } from "@/components/layout/PageShell";
import { SectionCard } from "@/components/layout/SectionCard";
import { getRecentPipelineRunsForSystem } from "@/lib/pipeline";

type SystemRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  hq_city: string | null;
  hq_state: string | null;
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
    .select("id, slug, name, website, hq_city, hq_state")
    .eq("slug", slug)
    .maybeSingle<SystemRow>();

  if (error || !system) {
    notFound();
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
  const briefingRuns = (briefingRunsData ?? []) as DailyBriefingRunRow[];
  const feedback = (feedbackData ?? []) as FeedbackRow[];

  // Fetch pipeline runs using the helper function
  const pipelineRuns = await getRecentPipelineRunsForSystem(supabase, system.id, 5);

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

  // Generate initials for avatar badge
  const initials = system.name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Format last updated date
  const lastUpdated = lastDocumentAt || lastSignalAt || lastBriefingAt;
  const lastUpdatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString()
    : "Never";

  // Format location
  const locationParts = [system.hq_city, system.hq_state].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  // Check if system has no data yet
  const hasNoData = documentCount === 0 && signalCount === 0 && entityCount === 0;

  return (
    <PageShell>
      {/* System Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{system.name}</h1>
            <p className="text-sm text-muted-foreground">
              {system.slug}
              {location && ` · ${location}`}
              {system.website && (
                <>
                  {" · "}
                  <a
                    href={system.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors hover:underline"
                  >
                    Visit site
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="bg-muted/50 px-2 py-1 rounded">
              <span className="font-medium text-foreground">{documentCount}</span> docs
            </span>
            <span className="bg-muted/50 px-2 py-1 rounded">
              <span className="font-medium text-foreground">{signalCount}</span> signals
            </span>
            <span className="bg-muted/50 px-2 py-1 rounded">
              <span className="font-medium text-foreground">{entityCount}</span> entities
            </span>
            {lastUpdated && (
              <span className="text-xs">
                Updated {lastUpdatedText}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Getting Started Callout */}
      {hasNoData && (
        <SectionCard className="mb-6 bg-muted/20">
          <h2 className="text-sm font-semibold mb-2">Getting Started</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This system has been seeded but no content has been ingested yet. To start collecting data:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Visit the{" "}
              <Link href={`/systems/${system.slug}/ingestion`} className="text-foreground hover:underline transition-colors">
                Ingestion page
              </Link>{" "}
              to manage seed URLs and trigger the pipeline
            </li>
            <li>Run the ingestion pipeline to crawl seed URLs and extract documents</li>
            <li>Documents will be processed to extract entities and signals</li>
            <li>Return here to see the populated data</li>
          </ol>
        </SectionCard>
      )}

      {/* Navigation */}
      <nav className="mb-6 pb-4 border-b border-border/40">
        <ul className="flex flex-wrap gap-3 list-none p-0">
          <li>
            <Link
              href={`/systems/${system.slug}/timeline`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {UICopy.systemSections.timeline}
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/deals`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {UICopy.systemSections.deals}
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/insights`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {UICopy.systemSections.insights}
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/outbound-playbook`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Outbound Playbook
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/strategy`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Strategy Briefing
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/meeting-prep`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Meeting Prep
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/account-plan`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Account Plan
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/opportunities`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Opportunities
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/chat`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Chat
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/systems/${system.slug}/ingestion`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Ingestion
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground text-xs">•</span>
          </li>
          <li>
            <Link
              href={`/demo?slug=${system.slug}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {UICopy.nav.heroDemo}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline - Priority section */}
        <SectionCard title="Pipeline" description="Recent pipeline runs" className="lg:col-span-2">
          <PipelineSection
            system={{ id: system.id, slug: system.slug, name: system.name }}
            pipelineRuns={pipelineRuns}
          />
        </SectionCard>

        {/* Signals - Priority section */}
        <SectionCard title={UICopy.systemSections.signals} description="Recent signals and alerts">
          {signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No signals yet for this system. Run the pipeline to generate new signals.
            </p>
          ) : (
            <>
              <ul className="space-y-3 divide-y divide-border/20">
                {signals.map((signal) => {
                  const documentRelation = Array.isArray(signal.documents)
                    ? signal.documents[0]
                    : signal.documents;
                  const documentUrl = documentRelation?.source_url ?? null;

                  return (
                    <li key={signal.id} className="pt-3 first:pt-0 first:border-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">{signal.severity ?? "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{signal.category ?? "Unknown"}</span>
                      </div>
                      <p className="text-sm mb-2">{signal.summary ?? "No summary provided."}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {signal.created_at ? new Date(signal.created_at).toLocaleDateString() : "Unknown"}
                      </p>
                      {documentUrl ? (
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                        >
                          Source document →
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {(() => {
                const signalsTotalPages = Math.max(1, Math.ceil((signalsTotal ?? 0) / pageSize));
                return (
                  <div className="mt-4 flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                      Page {sigPage} of {signalsTotalPages}
                    </p>
                    <div className="flex gap-2">
                      {sigPage > 1 && (
                        <Link
                          href={`?signals_page=${sigPage - 1}&documents_page=${docPage}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                        >
                          Previous
                        </Link>
                      )}
                      {sigPage < signalsTotalPages && (
                        <Link
                          href={`?signals_page=${sigPage + 1}&documents_page=${docPage}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
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
        </SectionCard>

        {/* Documents - Priority section */}
        <SectionCard title={UICopy.systemSections.documents} description="Ingested documents">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents yet for this system. Run the pipeline to ingest documents.
            </p>
          ) : (
            <>
              <ul className="space-y-3 divide-y divide-border/20">
                {documents.map((document) => (
                  <li key={document.id} className="pt-3 first:pt-0 first:border-0">
                    <p className="text-sm font-medium mb-1">{document.title ?? "Untitled"}</p>
                    <a
                      href={document.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline break-all block mb-1"
                    >
                      {document.source_url}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {document.crawled_at ? new Date(document.crawled_at).toLocaleDateString() : "Unknown"}
                    </p>
                  </li>
                ))}
              </ul>
              {(() => {
                const documentsTotalPages = Math.max(1, Math.ceil((documentsTotal ?? 0) / pageSize));
                return (
                  <div className="mt-4 flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                      Page {docPage} of {documentsTotalPages}
                    </p>
                    <div className="flex gap-2">
                      {docPage > 1 && (
                        <Link
                          href={`?documents_page=${docPage - 1}&signals_page=${sigPage}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                        >
                          Previous
                        </Link>
                      )}
                      {docPage < documentsTotalPages && (
                        <Link
                          href={`?documents_page=${docPage + 1}&signals_page=${sigPage}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
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
        </SectionCard>

        {/* System Health */}
        <SectionCard title="System Health" description="Health score and components">
          {health ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Band: </span>
                <span className="text-sm font-medium">{health.band}</span>
                <span className="text-xs text-muted-foreground mx-2">·</span>
                <span className="text-xs text-muted-foreground">Score: </span>
                <span className="text-sm font-medium">{health.overallScore}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Components:</p>
                <ul className="space-y-1 text-xs">
                  <li>Engagement: {health.components.engagementScore}</li>
                  <li>Opportunities: {health.components.opportunityScore}</li>
                  <li>Signals: {health.components.signalScore}</li>
                  <li>Risk: {health.components.riskScore}</li>
                </ul>
              </div>
              {health.reasons.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Why:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {health.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No health score available.</p>
          )}
        </SectionCard>

        {/* System Profile */}
        <SectionCard title="System Profile" description="System details and information">
          <SystemProfile slug={system.slug} systemId={system.id} />
        </SectionCard>

        {/* Account Plan */}
        <SectionCard title="Account Plan" className="bg-muted/20">
          <p className="text-sm">
            <Link
              href={`/systems/${system.slug}/account-plan`}
              className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Open Account Plan workspace →
            </Link>
          </p>
        </SectionCard>

        {/* Living System Narrative */}
        <SectionCard title="Living System Narrative" description="AI-generated narrative">
          <SystemNarrative slug={system.slug} />
        </SectionCard>

        {/* Key Contacts */}
        <SectionCard title="Key Contacts & Buying Committee" description="People and roles">
          <SystemContacts slug={system.slug} />
        </SectionCard>

        {/* Outbound Prep */}
        <SectionCard title="Outbound Prep & Playbook" description="Outbound strategy">
          <SystemOutboundPrep slug={system.slug} />
        </SectionCard>

        {/* Outbound Composer */}
        <SectionCard title="Outbound Draft Composer" description="Compose outbound messages">
          <SystemOutboundComposer slug={system.slug} />
        </SectionCard>

        {/* News */}
        <SectionCard title="News" description="Recent news articles">
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No news yet.</p>
          ) : (
            <ul className="space-y-2 divide-y divide-border/20">
              {news.map((n) => (
                <li key={n.id} className="pt-2 first:pt-0 first:border-0 hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2">
                  <a
                    href={n.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-foreground transition-colors hover:underline"
                  >
                    {n.title ?? "Untitled"}
                  </a>
                  <span className="text-xs text-muted-foreground ml-2">
                    {n.crawled_at ? new Date(n.crawled_at).toLocaleDateString() : "Unknown"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* System Actions */}
        <SectionCard title="System Actions" description="Run pipelines and generate content" className="lg:col-span-2">
          <SystemActions slug={system.slug} />
        </SectionCard>

        {/* Signal-Based Actions */}
        <SectionCard title="Signal-Based Actions" description="Actions based on signals">
          <SystemSignalActions slug={system.slug} signals={signals} />
        </SectionCard>

        {/* Suggested Opportunities */}
        <SectionCard title="Suggested Opportunities" description="AI-suggested opportunities">
          <SystemOpportunitySuggestions slug={system.slug} />
        </SectionCard>

        {/* Opportunities */}
        <SectionCard title="Opportunities" description="Tracked opportunities">
          <SystemOpportunities slug={system.slug} />
        </SectionCard>

        {/* Timeline */}
        <SectionCard title="Recent Timeline" description="System activity timeline" className="lg:col-span-2">
          <SystemTimeline systemSlug={system.slug} />
        </SectionCard>

        {/* Interaction Log */}
        <SectionCard title="Interaction Log" description="Recent interactions">
          <SystemInteractions slug={system.slug} />
        </SectionCard>

        {/* Daily Briefing Runs */}
        <SectionCard title="Daily Briefing Runs" description="Briefing generation history">
          {briefingRuns && briefingRuns.length > 0 ? (
            <ul className="space-y-2 divide-y divide-border/20">
              {briefingRuns.map((run) => (
                <li key={run.id} className="pt-2 first:pt-0 first:border-0 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {run.created_at ? new Date(run.created_at).toLocaleDateString() : "Unknown"}
                  </span>
                  <span className="ml-2">{run.status}</span>
                  {run.error_message && (
                    <span className="text-xs text-muted-foreground block mt-1">Error: {run.error_message}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No daily briefing runs yet.</p>
          )}
        </SectionCard>

        {/* Daily Briefing */}
        {briefingBullets && briefingNarrative && (
          <SectionCard title="Daily Briefing" description="Latest briefing summary" className="lg:col-span-2">
            <ul className="space-y-2 mb-4 text-sm">
              {briefingBullets.map((bullet, index) => (
                <li key={`${index}-${bullet}`}>{bullet}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">{briefingNarrative}</p>
          </SectionCard>
        )}

        {/* Entities */}
        <SectionCard title="Entities" description="People, facilities, initiatives, vendors, technologies">
          {!hasEntities ? (
            <p className="text-sm text-muted-foreground">No entities yet for this system. Run the pipeline to extract entities.</p>
          ) : (
            <div className="space-y-4">
              {ENTITY_SECTIONS.map((section) => {
                const sectionEntities = groupedEntities[section.key] ?? [];

                return (
                  <div key={section.key}>
                    <h3 className="text-xs font-semibold mb-2">{section.heading}</h3>
                    {sectionEntities.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No {section.heading.toLowerCase()} found.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
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
        </SectionCard>

        {/* Recent Feedback */}
        <SectionCard title="Recent Feedback" className="bg-muted/20">
          {feedback && feedback.length > 0 ? (
            <ul className="space-y-2 divide-y divide-border/20">
              {feedback.map((f) => (
                <li key={f.id} className="pt-2 first:pt-0 first:border-0 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : "Unknown"}
                  </span>
                  <span className="ml-2">{f.kind} – {f.sentiment}</span>
                  {f.comment && <span className="text-xs text-muted-foreground block mt-1">{f.comment}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
