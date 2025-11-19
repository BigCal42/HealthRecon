import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: systems, error } = await supabase
      .from("systems")
      .select("id, slug, name")
      .order("name", { ascending: true });

    if (error) {
      logger.error(error, "Failed to fetch systems");
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ systems: systems ?? [] });
  } catch (error) {
    logger.error(error, "Systems API error");
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

