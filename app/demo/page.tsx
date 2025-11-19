import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getHeroDemoData } from "@/lib/getHeroDemoData";
import { notFound } from "next/navigation";
import { HeroDemoChat } from "@/components/HeroDemoChat";
import { HeroDemoPipelineButton } from "@/components/HeroDemoPipelineButton";
import { BILH_SLUG } from "@/config/constants";
import { UICopy, ITEM_TYPE_LABELS } from "@/lib/uiCopy";
import Link from "next/link";

type DemoPageProps = {
  searchParams?: Promise<{ slug?: string }>;
};

export const dynamic = "force-dynamic";

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = createServerSupabaseClient();
  const slug = resolvedSearchParams?.slug || BILH_SLUG; // default hero demo system
  const data = await getHeroDemoData(supabase, slug);

  if (!data) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem" }}>
      <section>
        <h1>{UICopy.demoSections.headerTitle}</h1>
        <p>
          A single-page walkthrough of intelligence, focus, pipeline, and Q&A for this account.
        </p>
        <p>
          System: <strong>{data.system.name}</strong>{" "}
          {data.system.location && <>({data.system.location})</>}
        </p>
        {data.health && (
          <p>
            Health: {data.health.band} (Score: {data.health.score})
          </p>
        )}
        {data.system.website && (
          <p>
            Website:{" "}
            <a href={data.system.website} target="_blank" rel="noopener noreferrer">
              {data.system.website}
            </a>
          </p>
        )}
        <p>
          <Link href={`/systems/${data.system.slug}/deals`}>{UICopy.systemSections.deals}</Link> |{" "}
          <Link href={`/systems/${data.system.slug}/insights`}>
            {UICopy.systemSections.insights}
          </Link> |{" "}
          <Link href={`/systems/${data.system.slug}/timeline`}>
            {UICopy.systemSections.timeline}
          </Link> |{" "}
          <Link href={`/systems/${data.system.slug}/outbound-playbook`}>
            Generate outbound playbook for this account
          </Link>{" "}
          |{" "}
          <Link href={`/systems/${data.system.slug}/strategy`}>
            Generate Strategy Briefing for this system
          </Link>{" "}
          |{" "}
          <Link href={`/systems/${data.system.slug}/meeting-prep`}>
            Generate meeting prep for this system
          </Link>{" "}
          |{" "}
          <Link href={`/systems/${data.system.slug}/chat`}>
            Ask questions about this system
          </Link>
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>{UICopy.demoSections.pipelineTitle}</h2>
        <p>
          {UICopy.demoSections.pipelineDescription} It crawls public sources, extracts signals, and
          updates insights for <strong>{data.system.name}</strong>.
        </p>
        <HeroDemoPipelineButton slug={data.system.slug} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>{UICopy.demoSections.briefingTitle}</h2>
        {data.latestBriefing ? (
          <div>
            <p>Generated at: {new Date(data.latestBriefing.createdAt).toLocaleString()}</p>
            <h3>{data.latestBriefing.title}</h3>
            <ul>
              {data.latestBriefing.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            {data.latestBriefing.narrative && <p>{data.latestBriefing.narrative}</p>}
          </div>
        ) : (
          <p>No briefing yet. Run the pipeline above and generate a briefing.</p>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>{UICopy.demoSections.focusTitle}</h2>
        {data.focusItems.length === 0 ? (
          <p>No focus items for today for this account.</p>
        ) : (
          <ul>
            {data.focusItems.map((item) => (
              <li key={item.id} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>[{ITEM_TYPE_LABELS[item.type] ?? item.type}]</strong> {item.title}
                </p>
                {item.description && <p>{item.description}</p>}
                {item.when && <p>When: {item.when}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>{UICopy.demoSections.timelineTitle}</h2>
        {data.timelineItems.length === 0 ? (
          <p>No recent timeline items.</p>
        ) : (
          <ul>
            {data.timelineItems.map((item) => (
              <li key={item.id} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>[{ITEM_TYPE_LABELS[item.type] ?? item.type}]</strong>{" "}
                  {new Date(item.occurredAt).toLocaleString()}
                </p>
                <p>{item.title}</p>
                {item.description && <p>{item.description}</p>}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href={`/systems/${data.system.slug}/timeline`}>View full timeline</Link>
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>{UICopy.demoSections.chatTitle}</h2>
        <HeroDemoChat systemSlug={data.system.slug} />
      </section>
    </main>
  );
}

