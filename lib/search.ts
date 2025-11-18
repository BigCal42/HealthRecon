import type { SupabaseClient } from "@supabase/supabase-js";

export type SearchResultType =
  | "system"
  | "document"
  | "signal"
  | "opportunity"
  | "interaction"
  | "contact";

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  systemId?: string | null;
  systemSlug?: string | null;
  systemName?: string | null;
  title: string;
  snippet?: string | null;
  timestamp?: string | null;
}

export async function globalSearch(
  supabase: SupabaseClient,
  query: string,
  limitPerType: number = 10,
): Promise<SearchResultItem[]> {
  if (query.trim().length === 0) {
    return [];
  }

  // Query all 6 tables in parallel
  const [
    { data: systems },
    { data: documents },
    { data: signals },
    { data: opportunities },
    { data: interactions },
    { data: contacts },
  ] = await Promise.all([
    supabase
      .from("systems")
      .select("id, slug, name, website")
      .or(
        `name.ilike.%${query}%,slug.ilike.%${query}%,website.ilike.%${query}%`,
      )
      .limit(limitPerType),
    supabase
      .from("documents")
      .select("id, system_id, title, raw_text, source_type, crawled_at")
      .or(`title.ilike.%${query}%,raw_text.ilike.%${query}%`)
      .order("crawled_at", { ascending: false })
      .limit(limitPerType),
    supabase
      .from("signals")
      .select("id, system_id, summary, category, created_at")
      .or(`summary.ilike.%${query}%,category.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limitPerType),
    supabase
      .from("opportunities")
      .select("id, system_id, title, description, status, created_at")
      .or(
        `title.ilike.%${query}%,description.ilike.%${query}%,status.ilike.%${query}%`,
      )
      .order("created_at", { ascending: false })
      .limit(limitPerType),
    supabase
      .from("interactions")
      .select(
        "id, system_id, subject, summary, next_step, occurred_at, next_step_due_at",
      )
      .or(
        `subject.ilike.%${query}%,summary.ilike.%${query}%,next_step.ilike.%${query}%`,
      )
      .order("occurred_at", { ascending: false })
      .limit(limitPerType),
    supabase
      .from("contacts")
      .select(
        "id, system_id, full_name, title, department, email, seniority, role_in_deal, created_at",
      )
      .or(
        `full_name.ilike.%${query}%,title.ilike.%${query}%,department.ilike.%${query}%,email.ilike.%${query}%`,
      )
      .order("created_at", { ascending: false })
      .limit(limitPerType),
  ]);

  // Build system map from fetched systems
  const systemMap = new Map<
    string,
    { slug: string; name: string }
  >();

  if (systems) {
    for (const system of systems) {
      systemMap.set(system.id, { slug: system.slug, name: system.name });
    }
  }

  // Collect system_ids from other results and fetch missing systems
  const systemIds = new Set<string>();
  if (documents) {
    for (const doc of documents) {
      if (doc.system_id) systemIds.add(doc.system_id);
    }
  }
  if (signals) {
    for (const signal of signals) {
      if (signal.system_id) systemIds.add(signal.system_id);
    }
  }
  if (opportunities) {
    for (const opp of opportunities) {
      if (opp.system_id) systemIds.add(opp.system_id);
    }
  }
  if (interactions) {
    for (const interaction of interactions) {
      if (interaction.system_id) systemIds.add(interaction.system_id);
    }
  }
  if (contacts) {
    for (const contact of contacts) {
      if (contact.system_id) systemIds.add(contact.system_id);
    }
  }

  // Fetch missing systems
  const missingSystemIds = Array.from(systemIds).filter(
    (id) => !systemMap.has(id),
  );
  if (missingSystemIds.length > 0) {
    const { data: missingSystems } = await supabase
      .from("systems")
      .select("id, slug, name")
      .in("id", missingSystemIds);

    if (missingSystems) {
      for (const system of missingSystems) {
        systemMap.set(system.id, { slug: system.slug, name: system.name });
      }
    }
  }

  // Normalize results
  const results: SearchResultItem[] = [];

  // Systems
  if (systems) {
    for (const system of systems) {
      results.push({
        type: "system",
        id: system.id,
        systemId: system.id,
        systemSlug: system.slug,
        systemName: system.name,
        title: system.name,
        snippet: system.website || null,
        timestamp: null,
      });
    }
  }

  // Documents
  if (documents) {
    for (const doc of documents) {
      const systemInfo = doc.system_id ? systemMap.get(doc.system_id) : null;
      const snippet = doc.raw_text
        ? doc.raw_text.substring(0, 200)
        : null;
      results.push({
        type: "document",
        id: doc.id,
        systemId: doc.system_id || null,
        systemSlug: systemInfo?.slug || null,
        systemName: systemInfo?.name || null,
        title: doc.title || "Untitled Document",
        snippet,
        timestamp: doc.crawled_at || null,
      });
    }
  }

  // Signals
  if (signals) {
    for (const signal of signals) {
      const systemInfo = signal.system_id ? systemMap.get(signal.system_id) : null;
      results.push({
        type: "signal",
        id: signal.id,
        systemId: signal.system_id || null,
        systemSlug: systemInfo?.slug || null,
        systemName: systemInfo?.name || null,
        title: `Signal: ${signal.summary}`,
        snippet: signal.category || null,
        timestamp: signal.created_at || null,
      });
    }
  }

  // Opportunities
  if (opportunities) {
    for (const opp of opportunities) {
      const systemInfo = opp.system_id ? systemMap.get(opp.system_id) : null;
      const snippet = opp.description
        ? opp.description.substring(0, 200)
        : null;
      results.push({
        type: "opportunity",
        id: opp.id,
        systemId: opp.system_id || null,
        systemSlug: systemInfo?.slug || null,
        systemName: systemInfo?.name || null,
        title: opp.title,
        snippet,
        timestamp: opp.created_at || null,
      });
    }
  }

  // Interactions
  if (interactions) {
    for (const interaction of interactions) {
      const systemInfo = interaction.system_id
        ? systemMap.get(interaction.system_id)
        : null;
      const snippet = interaction.summary
        ? interaction.summary.substring(0, 200)
        : null;
      results.push({
        type: "interaction",
        id: interaction.id,
        systemId: interaction.system_id || null,
        systemSlug: systemInfo?.slug || null,
        systemName: systemInfo?.name || null,
        title: interaction.subject || "Interaction",
        snippet,
        timestamp: interaction.occurred_at || null,
      });
    }
  }

  // Contacts
  if (contacts) {
    for (const contact of contacts) {
      const systemInfo = contact.system_id
        ? systemMap.get(contact.system_id)
        : null;
      const titleParts = [contact.full_name];
      if (contact.title) titleParts.push(`– ${contact.title}`);
      results.push({
        type: "contact",
        id: contact.id,
        systemId: contact.system_id || null,
        systemSlug: systemInfo?.slug || null,
        systemName: systemInfo?.name || null,
        title: titleParts.join(" "),
        snippet: contact.department || contact.email || null,
        timestamp: contact.created_at || null,
      });
    }
  }

  // Sort by timestamp descending, fallback to type/name
  results.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (a.timestamp && !b.timestamp) return -1;
    if (!a.timestamp && b.timestamp) return 1;
    // Fallback: sort by type, then title
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return a.title.localeCompare(b.title);
  });

  return results;
}

