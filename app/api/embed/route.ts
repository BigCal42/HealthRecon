import { NextResponse } from "next/server";

import { openai } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type DocumentRow = {
  id: string;
  system_id: string;
  title: string | null;
  raw_text: string | null;
};

type EmbeddingRow = {
  document_id: string;
};

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, system_id, title, raw_text")
      .order("crawled_at", { ascending: false })
      .limit(10)
      .returns<DocumentRow[]>();

    if (error) {
      console.error("Failed to load documents", error);
      return NextResponse.json({ embedded: 0, error: "embedding_failed" });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ embedded: 0 });
    }

    const { data: existing } = await supabase
      .from("document_embeddings")
      .select("document_id")
      .returns<EmbeddingRow[]>();

    const embeddedIds = new Set((existing ?? []).map((row) => row.document_id));
    const docsToEmbed = (docs ?? []).filter((doc) => !embeddedIds.has(doc.id));

    if (docsToEmbed.length === 0) {
      return NextResponse.json({ embedded: 0 });
    }

    const texts = docsToEmbed.map(
      (doc) => `${doc.title ?? ""}\n\n${doc.raw_text ?? ""}`,
    );

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    for (let i = 0; i < docsToEmbed.length; i++) {
      const { error: insertError } = await supabase
        .from("document_embeddings")
        .insert({
          document_id: docsToEmbed[i].id,
          embedding: response.data[i].embedding,
        });

      if (insertError) {
        console.error("Failed to insert embedding", insertError);
      }
    }

    return NextResponse.json({ embedded: docsToEmbed.length });
  } catch (error) {
    console.error("Embedding error:", error);
    return NextResponse.json({ embedded: 0, error: "embedding_failed" });
  }
}

