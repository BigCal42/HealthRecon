import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug: string;
      kind: string;
      targetId?: string;
      sentiment: string;
      comment?: string;
    };

    if (!body.slug || !body.kind || !body.sentiment) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return NextResponse.json(
        { ok: false, error: "system_not_found" },
        { status: 404 },
      );
    }

    const { error: insertError } = await supabase.from("feedback").insert({
      system_id: system.id,
      kind: body.kind,
      target_id: body.targetId ?? null,
      sentiment: body.sentiment,
      comment: body.comment ?? null,
    });

    if (insertError) {
      logger.error(insertError, "Failed to insert feedback");
      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error, "Feedback API error");
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

