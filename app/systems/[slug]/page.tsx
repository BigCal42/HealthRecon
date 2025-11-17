import { BILH_SLUG } from "@/config/constants";
import { groupBy } from "@/lib/groupBy";
import type { EntityType } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { SystemActions } from "@/components/SystemActions";
import { SystemChat } from "@/components/SystemChat";
import { SystemOpportunities } from "@/components/SystemOpportunities";
import { SystemOpportunitySuggestions } from "@/components/SystemOpportunitySuggestions";
import { SystemProfile } from "@/components/SystemProfile";

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
};

export default async function SystemPage({ params }: SystemPageProps) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

  const { data: system, error } = await supabase
    .from("systems")
    .select("id, slug, name, website")
    .eq("slug", slug)
    .maybeSingle<SystemRow>();

  if (error || !system) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>System not found</h1>
        <p>
          {error
            ? "Unable to load system data."
            : `The system "${slug}" does not exist.`}
        </p>
        <p style={{ color: "#666" }}>
          Currently only the {BILH_SLUG.toUpperCase()} system is seeded.
        </p>
      </div>
    );
  }

  const { data: briefing } = await supabase
    .from("daily_briefings")
    .select("*")
    .eq("system_id", system.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DailyBriefingRow>();

  const [
    { data: documentsData },
    { data: entitiesData },
    { data: signalsData },
    { data: newsData },
    { data: pipelineRunsData },
    { data: briefingRunsData },
    { data: feedbackData },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, source_url, crawled_at")
      .eq("system_id", system.id)
      .order("crawled_at", { ascending: false }),
    supabase
      .from("entities")
      .select("id, type, name, role")
      .eq("system_id", system.id),
    supabase
      .from("signals")
      .select("id, severity, category, summary, created_at, documents(source_url)")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, source_url, crawled_at")
      .eq("system_id", system.id)
      .eq("source_type", "news")
      .order("crawled_at", { ascending: false }),
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
      console.error("Failed to parse daily briefing summary", parseError);
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
  const documentCount = documents.length;
  const entityCount = entities.length;
  const signalCount = signals.length;
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
    <div style={{ padding: "2rem" }}>
      <h1>{system.name}</h1>
      {system.website && (
        <p>
          <a href={system.website} target="_blank" rel="noopener noreferrer">
            {system.website}
          </a>
        </p>
      )}

      <section style={{ marginTop: "2rem" }}>
        <h2>System Overview</h2>
        <ul>
          <li>Total documents: {documentCount}</li>
          <li>Total entities: {entityCount}</li>
          <li>Total signals: {signalCount}</li>
          <li>Last document: {lastDocumentAt ?? "N/A"}</li>
          <li>Last signal: {lastSignalAt ?? "N/A"}</li>
          <li>Last briefing: {lastBriefingAt ?? "N/A"}</li>
        </ul>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>System Profile</h2>
        <SystemProfile slug={system.slug} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>News</h2>
        {news.length === 0 ? (
          <p>No news yet.</p>
        ) : (
          <ul>
            {news.map((n) => (
              <li key={n.id}>
                <a href={n.source_url} target="_blank" rel="noopener noreferrer">
                  {n.title ?? "Untitled"}
                </a>{" "}
                – {n.crawled_at ? new Date(n.crawled_at).toLocaleString() : "Unknown"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SystemActions slug={system.slug} />

      <section style={{ marginTop: "2rem" }}>
        <h2>Suggested Opportunities</h2>
        <SystemOpportunitySuggestions slug={system.slug} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Opportunities</h2>
        <SystemOpportunities slug={system.slug} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Run History</h2>
        <h3>Pipeline Runs</h3>
        {pipelineRuns && pipelineRuns.length > 0 ? (
          <ul>
            {pipelineRuns.map((run) => (
              <li key={run.id}>
                [{run.created_at ? new Date(run.created_at).toLocaleString() : "Unknown"}] {run.status} – ingest: {run.ingest_created}, process: {run.process_processed}
                {run.error_message ? <> – Error: {run.error_message}</> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No pipeline runs yet.</p>
        )}
        <h3>Daily Briefing Runs</h3>
        {briefingRuns && briefingRuns.length > 0 ? (
          <ul>
            {briefingRuns.map((run) => (
              <li key={run.id}>
                [{run.created_at ? new Date(run.created_at).toLocaleString() : "Unknown"}] {run.status}
                {run.error_message ? <> – Error: {run.error_message}</> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No daily briefing runs yet.</p>
        )}
      </section>

      <SystemChat slug={system.slug} />

      {briefingBullets && briefingNarrative && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Daily Briefing</h2>
          <ul>
            {briefingBullets.map((bullet, index) => (
              <li key={`${index}-${bullet}`}>{bullet}</li>
            ))}
          </ul>
          <p>{briefingNarrative}</p>
          <hr />
        </section>
      )}

      <section style={{ marginTop: "2rem" }}>
        <h2>Signals</h2>
        {signals.length === 0 ? (
          <p>No signals yet</p>
        ) : (
          <ul>
            {signals.map((signal) => {
              const documentRelation = Array.isArray(signal.documents)
                ? signal.documents[0]
                : signal.documents;
              const documentUrl = documentRelation?.source_url ?? null;

              return (
                <li key={signal.id} style={{ marginBottom: "1rem" }}>
                  <p>Severity: {signal.severity ?? "Unknown"}</p>
                  <p>Category: {signal.category ?? "Unknown"}</p>
                  <p>{signal.summary ?? "No summary provided."}</p>
                  <p>Created: {signal.created_at ?? "Unknown"}</p>
                  {documentUrl ? (
                    <p>
                      <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                        Source document
                      </a>
                    </p>
                  ) : (
                    <p>No source document available.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Entities</h2>
        {!hasEntities ? (
          <p>No entities yet</p>
        ) : (
          ENTITY_SECTIONS.map((section) => {
            const sectionEntities = groupedEntities[section.key] ?? [];

            return (
              <div key={section.key} style={{ marginBottom: "1rem" }}>
                <h3>{section.heading}</h3>
                {sectionEntities.length === 0 ? (
                  <p>No {section.heading.toLowerCase()} found.</p>
                ) : (
                  <ul>
                    {sectionEntities.map((entity) => (
                      <li key={entity.id}>
                        <span>{entity.name}</span>
                        {entity.role ? <span> — {entity.role}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Documents</h2>
        {documents.length === 0 ? (
          <p>No documents yet</p>
        ) : (
          <ul>
            {documents.map((document) => (
              <li key={document.id} style={{ marginBottom: "1rem" }}>
                <p>{document.title ?? "Untitled"}</p>
                <p>
                  <a href={document.source_url} target="_blank" rel="noopener noreferrer">
                    {document.source_url}
                  </a>
                </p>
                <p>Crawled: {document.crawled_at ?? "Unknown"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Recent Feedback</h2>
        {feedback && feedback.length > 0 ? (
          <ul>
            {feedback.map((f) => (
              <li key={f.id}>
                [{f.created_at ? new Date(f.created_at).toLocaleString() : "Unknown"}] {f.kind} – {f.sentiment}
                {f.comment ? <> – {f.comment}</> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No feedback yet.</p>
        )}
      </section>
    </div>
  );
}

