import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import type { ChatResponsePayload } from "@/lib/chatTypes";
import { embeddingToVectorString } from "@/lib/embeddings";
import { createResponse, embedText, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase and OpenAI integrations
export const runtime = "nodejs";

type DocumentMatch = {
  id: string;
  title: string | null;
  source_url: string | null;
  raw_text: string | null;
  similarity: number;
};

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = createRequestContext("/api/chat");
  ctx.logInfo("Chat request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `chat:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const chatSchema = z.object({
      systemSlug: z.string().min(1).max(100).optional(),
      slug: z.string().min(1).max(100).optional(),
      question: z.string().min(1).max(2000),
    });

    const body = await parseJsonBody(request, chatSchema);

    // Support both systemSlug (new) and slug (legacy) for backward compatibility
    const systemSlug = body.systemSlug ?? body.slug;
    if (!systemSlug) {
      return apiError(400, "invalid_request", "systemSlug or slug is required");
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id, slug, name")
      .eq("slug", systemSlug)
      .maybeSingle<{ id: string; slug: string; name: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const embeddings = await embedText({
      input: body.question,
      model: "text-embedding-3-small",
    });

    const questionEmbedding = embeddings[0];

    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_documents_for_system",
      {
        query_embedding: embeddingToVectorString(questionEmbedding),
        system_id: system.id,
        match_count: 5,
      },
    );

    if (rpcError) {
      ctx.logError(rpcError, "RPC error", { systemSlug, systemId: system.id });
      return apiError(500, "chat_failed", "Failed to retrieve relevant documents");
    }

    const matchesList: DocumentMatch[] = (matches as DocumentMatch[] | null) ?? [];

    if (matchesList.length === 0) {
      return apiSuccess<ChatResponsePayload>({
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
      ctx.logError(new Error("Failed to generate response"), "Failed to generate response", { systemSlug });
      return apiError(502, "chat_failed", "Failed to generate response");
    }

    ctx.logInfo("Chat completed", { systemSlug, sourcesCount: matchesList.length });

    return apiSuccess<ChatResponsePayload>({
      answer: rawOutput,
      sources: matchesList.map((match: DocumentMatch) => ({
        documentId: match.id,
        title: match.title,
        sourceUrl: match.source_url,
        sourceType: null,
      })),
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Chat error");
    return apiError(500, "chat_failed", "An unexpected error occurred");
  }
}

