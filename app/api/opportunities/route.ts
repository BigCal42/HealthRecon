import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "slug query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return NextResponse.json(
        { error: "system_not_found" },
        { status: 404 },
      );
    }

    const { data: opportunities, error: opportunitiesError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false });

    if (opportunitiesError) {
      logger.error(opportunitiesError, "Failed to fetch opportunities");
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ opportunities: opportunities ?? [] });
  } catch (error) {
    logger.error(error, "Opportunities API error");
    return NextResponse.json(
      { error: "unexpected_error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug: string;
      title: string;
      description?: string;
      status?: string;
      sourceKind?: string;
      sourceId?: string;
    };

    if (!body.slug || !body.title) {
      return NextResponse.json(
        { ok: false, error: "slug and title are required" },
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

    const { error: insertError } = await supabase.from("opportunities").insert({
      system_id: system.id,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "open",
      source_kind: body.sourceKind ?? null,
      source_id: body.sourceId ?? null,
    });

    if (insertError) {
      logger.error(insertError, "Failed to insert opportunity");
      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error, "Opportunities API error");
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

