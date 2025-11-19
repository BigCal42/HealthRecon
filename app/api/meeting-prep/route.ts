import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getMeetingPrep } from "@/lib/getMeetingPrep";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

const meetingPrepSchema = z.object({
  systemSlug: z.string().min(1),
  meetingType: z.enum(["intro", "discovery", "strategy_review", "renewal", "exec_briefing"]),
  audienceDescription: z.string().max(500).optional(),
  myObjective: z.string().max(500).optional(),
  timeBoxMinutes: z.number().int().min(15).max(180).optional(),
});

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/meeting-prep");
  ctx.logInfo("Meeting prep generation request received");

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = await checkRateLimit({
    key: `meeting-prep:${ip}`,
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
    const supabase = createServerSupabaseClient();

    const body = await parseJsonBody(request, meetingPrepSchema);

    const meetingPrep = await getMeetingPrep(supabase, {
      systemSlug: body.systemSlug,
      meetingType: body.meetingType,
      audienceDescription: body.audienceDescription ?? null,
      myObjective: body.myObjective ?? null,
      timeBoxMinutes: body.timeBoxMinutes ?? null,
    });

    if (!meetingPrep) {
      ctx.logError(new Error("Meeting prep generation failed"), "Meeting prep generation failed", {
        systemSlug: body.systemSlug,
        meetingType: body.meetingType,
      });
      return apiError(404, "not_found", "System not found or meeting prep unavailable.");
    }

    ctx.logInfo("Meeting prep generated successfully", {
      systemSlug: body.systemSlug,
      meetingType: body.meetingType,
    });

    return apiSuccess(meetingPrep);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Meeting prep generation error");
    return apiError(500, "generation_failed", "An unexpected error occurred");
  }
}
