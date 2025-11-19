import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createResponse, extractTextFromResponse, openai } from "@/lib/openaiClient";
import { rateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type DocumentMatch = {
  id: string;
  title: string | null;
  source_url: string | null;
  raw_text: string | null;
  similarity: number;
};

export async function POST(request: Request): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const ok = rateLimit({
    key: `post:${ip}:${request.url}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!ok) {
    logger.warn("Rate limit exceeded", { ip, url: request.url });
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { slug?: string; question?: string };

    if (!body.slug || !body.question) {
      return NextResponse.json(
        { error: "slug and question are required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string; slug: string; name: string }>();

    if (systemError || !system) {
      return NextResponse.json(
        { error: "system_not_found" },
        { status: 404 },
      );
    }

    const questionEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: body.question,
    });

    const questionEmbedding = questionEmbeddingResponse.data[0].embedding;

    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_documents_for_system",
      {
        query_embedding: questionEmbedding,
        system_id: system.id,
        match_count: 5,
      },
    );

    if (rpcError) {
      logger.error(rpcError, "RPC error");
      return NextResponse.json(
        { error: "chat_failed" },
        { status: 500 },
      );
    }

    const matchesList: DocumentMatch[] = (matches as DocumentMatch[] | null) ?? [];

    if (matchesList.length === 0) {
      return NextResponse.json({
        answer: "I don't have enough information to answer this question.",
        sources: [],
      });
    }

    const contextParts = matchesList.map((match: DocumentMatch) => {
      const truncatedText =
        (match.raw_text ?? "").length > 1000
          ? (match.raw_text ?? "").substring(0, 1000) + "..."
          : match.raw_text ?? "";
      return `Title: ${match.title ?? "Untitled"}\nURL: ${match.source_url}\nContent: ${truncatedText}`;
    });

    const context = contextParts.join("\n\n---\n\n");

    const prompt = [
      "You are a focused assistant that answers questions about a specific healthcare system using only the provided context. If the answer is not in the context, say you don't know.",
      `Question: ${body.question}`,
      "Context:",
      context,
    ].join("\n\n");

    const response = await createResponse({ prompt });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      return NextResponse.json(
        { error: "chat_failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      answer: rawOutput,
      sources: matchesList.map((match: DocumentMatch) => ({
        id: match.id,
        title: match.title,
        source_url: match.source_url,
        similarity: match.similarity,
      })),
    });
  } catch (error) {
    logger.error(error, "Chat error");
    return NextResponse.json({ error: "chat_failed" }, { status: 500 });
  }
}

