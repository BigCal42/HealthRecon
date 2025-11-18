import { NextResponse } from "next/server";

import { BILH_SLUG } from "@/config/constants";
import { logger } from "@/lib/logger";
import { runProcessForSystem } from "@/lib/pipeline/process";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    let slug = BILH_SLUG;

    try {
      const body = (await request.json()) as { slug?: string };
      if (body && typeof body === "object" && typeof body.slug === "string") {
        slug = body.slug;
      }
    } catch {
      // Ignore invalid / missing JSON bodies, default slug applies.
    }

    const supabase = createServerSupabaseClient();
    const result = await runProcessForSystem(supabase, slug);

    return NextResponse.json({ slug, processed: result.processed });
  } catch (error) {
    logger.error(error, "Processing error");
    return NextResponse.json({ processed: 0 });
  }
}

