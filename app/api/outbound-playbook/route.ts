import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { getOutboundPlaybook, type OutboundPersona } from "@/lib/getOutboundPlaybook";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

const personaSchema = z.enum([
  "cio",
  "cfo",
  "cmo",
  "cnio",
  "cmio",
  "operations_leader",
  "it_director",
]);

const postSchema = z.object({
  systemSlug: z.string().min(1).max(100),
  persona: personaSchema,
});

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/outbound-playbook");
  ctx.logInfo("Outbound playbook generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `outbound-playbook:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", {
      ip,
      resetAt: rateLimitResult.resetAt,
    });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  try {
    const body = await parseJsonBody(request, postSchema);

    const supabase = createServerSupabaseClient();

    const playbook = await getOutboundPlaybook(supabase, {
      systemSlug: body.systemSlug,
      persona: body.persona as OutboundPersona,
    });

    if (!playbook) {
      ctx.logError(
        new Error("Playbook generation returned null"),
        "Playbook generation failed",
        { systemSlug: body.systemSlug, persona: body.persona },
      );
      return apiError(404, "not_found", "System not found or playbook unavailable.");
    }

    ctx.logInfo("Outbound playbook generated successfully", {
      systemSlug: body.systemSlug,
      persona: body.persona,
      talkingPointsCount: playbook.talkingPoints.length,
      snippetsCount: playbook.snippets.length,
    });

    return apiSuccess(playbook);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Outbound playbook generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}
