import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { BILH_SLUG } from "@/config/constants";
import { getSystemContext } from "@/lib/getSystemContext";
import { createResponse, extractTextFromResponse } from "@/lib/openaiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for OpenAI and Supabase integrations
export const runtime = "nodejs";

type ComparisonResult = {
  systemA: { summary: string };
  systemB: { summary: string };
  similarities: string[];
  differences: string[];
  opportunities_for_systemA: string[];
  opportunities_for_systemB: string[];
};

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/compare-systems");
  ctx.logInfo("Compare systems request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `compare-systems:${ip}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    ctx.logError(new Error("Rate limit exceeded"), "Rate limit exceeded", { ip, resetAt: rateLimitResult.resetAt });
    return apiError(429, "rate_limited", "Rate limit exceeded.");
  }

  let systemA: string | undefined;
  let systemB: string | undefined;

  try {
    const supabase = createServerSupabaseClient();

    const postSchema = z.object({
      systemA: z.string().min(1).max(100).optional(),
      systemB: z.string().min(1).max(100).optional(),
    });

    try {
      const body = await parseJsonBody(request, postSchema);
      systemA = body.systemA;
      systemB = body.systemB;
    } catch {
      // If validation fails, use defaults
    }

    // Default systemA to "bilh"
    if (!systemA) {
      systemA = BILH_SLUG;
    }

    // Default systemB to first system not equal to "bilh"
    if (!systemB) {
      const { data: systems } = await supabase
        .from("systems")
        .select("slug")
        .neq("slug", systemA)
        .limit(1);

      if (!systems || systems.length === 0) {
        return apiError(404, "system_not_found", "No systems found for comparison");
      }

      systemB = systems[0].slug;
    }

    // Look up both systems
    const [{ data: systemARow, error: systemAError }, { data: systemBRow, error: systemBError }] =
      await Promise.all([
        supabase
          .from("systems")
          .select("id, slug, name")
          .eq("slug", systemA)
          .maybeSingle<{ id: string; slug: string; name: string }>(),
        supabase
          .from("systems")
          .select("id, slug, name")
          .eq("slug", systemB)
          .maybeSingle<{ id: string; slug: string; name: string }>(),
      ]);

    if (systemAError || !systemARow) {
      return apiError(404, "system_not_found", "System A not found");
    }

    if (systemBError || !systemBRow) {
      return apiError(404, "system_not_found", "System B not found");
    }

    // Get contexts for both systems
    const [contextA, contextB] = await Promise.all([
      getSystemContext(supabase, systemARow.id),
      getSystemContext(supabase, systemBRow.id),
    ]);

    // Prepare context strings, trim to 20k chars each
    const contextAStr = JSON.stringify(contextA);
    const contextBStr = JSON.stringify(contextB);

    const trimmedContextA = contextAStr.length > 20000 ? contextAStr.substring(0, 20000) : contextAStr;
    const trimmedContextB = contextBStr.length > 20000 ? contextBStr.substring(0, 20000) : contextBStr;

    // Build prompt
    const prompt = [
      "You are a healthcare intelligence analyst. Provide a structured JSON comparison of two healthcare systems based on their signals, entities, and news. Return only valid JSON.",
      `System A name: ${contextA.system.name}`,
      `System B name: ${contextB.system.name}`,
      "Context for System A:",
      trimmedContextA,
      "Context for System B:",
      trimmedContextB,
      "Provide a JSON object with the following structure:",
      "{",
      '  "systemA": { "summary": "brief summary of system A" },',
      '  "systemB": { "summary": "brief summary of system B" },',
      '  "similarities": ["similarity 1", "similarity 2", ...],',
      '  "differences": ["difference 1", "difference 2", ...],',
      '  "opportunities_for_systemA": ["opportunity 1", "opportunity 2", ...],',
      '  "opportunities_for_systemB": ["opportunity 1", "opportunity 2", ...]',
      "}",
    ].join("\n\n");

    // Call OpenAI
    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput = extractTextFromResponse(response);

    if (!rawOutput) {
      return apiError(502, "generation_failed", "Model response missing");
    }

    let parsed: ComparisonResult;

    try {
      parsed = JSON.parse(rawOutput) as ComparisonResult;
    } catch (error) {
      ctx.logError(error, "Failed to parse model output", { rawOutput, systemA, systemB });
      return apiError(502, "generation_failed", "Failed to parse model output");
    }

    // Validate structure
    if (
      !parsed.systemA ||
      !parsed.systemB ||
      !Array.isArray(parsed.similarities) ||
      !Array.isArray(parsed.differences) ||
      !Array.isArray(parsed.opportunities_for_systemA) ||
      !Array.isArray(parsed.opportunities_for_systemB)
    ) {
      return apiError(502, "generation_failed", "Invalid response structure");
    }

    ctx.logInfo("Systems compared successfully", { systemA, systemB });
    return apiSuccess(parsed);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Compare systems error", { systemA, systemB });
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}

