import { NextResponse } from "next/server";

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

    const { data: seeds, error: seedsError } = await supabase
      .from("system_seeds")
      .select("id, url, active, created_at")
      .eq("system_id", system.id)
      .order("created_at", { ascending: false });

    if (seedsError) {
      console.error("Failed to fetch seeds", seedsError);
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ seeds: seeds ?? [] });
  } catch (error) {
    console.error("System seeds API error:", error);
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
      url: string;
      active?: boolean;
    };

    if (!body.slug || !body.url) {
      return NextResponse.json(
        { ok: false, error: "slug and url are required" },
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

    const { error: insertError } = await supabase.from("system_seeds").insert({
      system_id: system.id,
      url: body.url,
      active: body.active ?? true,
    });

    if (insertError) {
      console.error("Failed to insert seed", insertError);
      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("System seeds API error:", error);
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

