import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { validateInternalApiKey } from "@/lib/api/auth";
import { embeddingToVectorString } from "@/lib/embeddings";
import { embedText } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type DocumentRow = {
  id: string;
  system_id: string;
  title: string | null;
  raw_text: string | null;
};

type EmbeddingRow = {
  document_id: string;
};

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/embed");
  ctx.logInfo("Embedding request received");

  try {
    // Validate internal API key
    try {
      validateInternalApiKey(request);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = await checkRateLimit({
      key: `embed:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
      return apiError(429, "rate_limited", "Rate limit exceeded.");
    }

    const supabase = createServerSupabaseClient();

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, system_id, title, raw_text")
      .order("crawled_at", { ascending: false })
      .limit(10)
      .returns<DocumentRow[]>();

    if (error) {
      ctx.logError(error, "Failed to load documents");
      return apiError(500, "embedding_failed", "Failed to load documents");
    }

    if (!docs || docs.length === 0) {
      return apiSuccess({ embedded: 0 });
    }

    const { data: existing } = await supabase
      .from("document_embeddings")
      .select("document_id")
      .returns<EmbeddingRow[]>();

    const embeddedIds = new Set((existing ?? []).map((row) => row.document_id));
    const docsToEmbed = (docs ?? []).filter((doc) => !embeddedIds.has(doc.id));

    if (docsToEmbed.length === 0) {
      return apiSuccess({ embedded: 0 });
    }

    const texts = docsToEmbed.map(
      (doc) => `${doc.title ?? ""}\n\n${doc.raw_text ?? ""}`,
    );

    const embeddings = await embedText({
      input: texts,
      model: "text-embedding-3-small",
    });

    // Batch insert embeddings
    const embeddingRows = docsToEmbed.map((doc, i) => ({
      document_id: doc.id,
      embedding: embeddingToVectorString(embeddings[i]),
    }));

    const { error: insertError } = await supabase
      .from("document_embeddings")
      .insert(embeddingRows);

    if (insertError) {
      ctx.logError(insertError, "Failed to insert embeddings", { count: embeddingRows.length });
      // Continue anyway - partial success is acceptable
    }

    ctx.logInfo("Embeddings completed successfully", { embedded: docsToEmbed.length });
    return apiSuccess({ embedded: docsToEmbed.length });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Embedding error");
    return apiError(500, "embedding_failed", "An unexpected error occurred during embedding");
  }
}

