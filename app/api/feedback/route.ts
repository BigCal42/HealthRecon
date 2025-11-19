import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/feedback");
  ctx.logInfo("Feedback submission request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `feedback:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const feedbackSchema = z.object({
      systemSlug: z.string().min(1),
      route: z.string().min(1),
      question: z.string().min(1),
      answer: z.string().min(1),
      rating: z.enum(["up", "down"]),
      meta: z
        .object({
          sources: z
            .array(
              z.object({
                documentId: z.string().uuid().optional(),
                title: z.string().optional(),
                sourceUrl: z.string().url().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    });

    const body = await parseJsonBody(request, feedbackSchema);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", body.systemSlug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    // Map rating to sentiment: "up" -> "positive", "down" -> "negative"
    const sentiment = body.rating === "up" ? "positive" : "negative";

    // Encode question, answer, and meta into comment JSON
    const commentData = {
      question: body.question,
      answer: body.answer,
      meta: body.meta,
    };

    const { error: insertError } = await supabase.from("feedback").insert({
      system_id: system.id,
      kind: body.route,
      target_id: null,
      sentiment,
      comment: JSON.stringify(commentData),
    });

    if (insertError) {
      ctx.logError(insertError, "Failed to insert feedback", { systemSlug: body.systemSlug, systemId: system.id });
      return apiError(500, "insert_failed", "Failed to insert feedback");
    }

    // Log only metadata, not full question/answer content
    ctx.logInfo("Feedback submitted successfully", {
      systemSlug: body.systemSlug,
      systemId: system.id,
      route: body.route,
      rating: body.rating,
    });
    return apiSuccess({});
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Feedback API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

