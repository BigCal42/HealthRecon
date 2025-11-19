import { NextResponse } from "next/server";

import { compareSystems } from "@/lib/compareSystems";
import { generateComparisonNarrative } from "@/lib/generateComparisonNarrative";
import { logger } from "@/lib/logger";
import { openai } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugA = searchParams.get("slugA");
    const slugB = searchParams.get("slugB");
    const noNarrative = searchParams.get("noNarrative") === "1";

    if (!slugA || !slugB) {
      return NextResponse.json(
        { error: "slugA and slugB query parameters are required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Lookup systems by slug
    const [{ data: systemA, error: systemAError }, { data: systemB, error: systemBError }] =
      await Promise.all([
        supabase
          .from("systems")
          .select("id")
          .eq("slug", slugA)
          .maybeSingle<{ id: string }>(),
        supabase
          .from("systems")
          .select("id")
          .eq("slug", slugB)
          .maybeSingle<{ id: string }>(),
      ]);

    if (systemAError || !systemA) {
      return NextResponse.json(
        { error: "system_not_found", message: `System with slug "${slugA}" not found` },
        { status: 404 },
      );
    }

    if (systemBError || !systemB) {
      return NextResponse.json(
        { error: "system_not_found", message: `System with slug "${slugB}" not found` },
        { status: 404 },
      );
    }

    // Compare systems
    let comparison = await compareSystems(supabase, systemA.id, systemB.id);

    // Generate narratives unless skipped
    if (!noNarrative) {
      try {
        comparison = await generateComparisonNarrative(openai, comparison);
      } catch (error) {
        logger.error(error, "Failed to generate comparison narrative");
        return NextResponse.json(
          { error: "narrative_generation_failed", message: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ comparison });
  } catch (error) {
    logger.error(error, "Compare API error");
    return NextResponse.json(
      { error: "unexpected_error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

