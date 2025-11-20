import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemOpportunities } from "@/lib/getSystemOpportunities";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ctx = createRequestContext(`/api/systems/${slug}/opportunities`);
  ctx.logInfo("System opportunities request received", { slug });

  try {
    if (!slug || typeof slug !== "string" || slug.length === 0 || slug.length > 100) {
      return apiError(400, "invalid_slug", "Invalid system slug");
    }

    const supabase = createServerSupabaseClient();
    const buckets = await getSystemOpportunities(supabase, slug);

    if (!buckets) {
      return apiError(404, "not_found", "System not found");
    }

    ctx.logInfo("System opportunities fetched successfully", { slug });
    return apiSuccess(buckets);
  } catch (error) {
    ctx.logError(error, "System opportunities API error", { slug });
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

