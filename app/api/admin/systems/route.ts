import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: systems, error } = await supabase
      .from("systems")
      .select("id, slug, name, website, hq_city, hq_state")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch systems", error);
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ systems: systems ?? [] });
  } catch (error) {
    console.error("Systems API error:", error);
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
      name: string;
      website?: string;
      hqCity?: string;
      hqState?: string;
    };

    if (!body.slug || !body.name) {
      return NextResponse.json(
        { ok: false, error: "slug and name are required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { error: insertError } = await supabase.from("systems").insert({
      slug: body.slug,
      name: body.name,
      website: body.website ?? null,
      hq_city: body.hqCity ?? null,
      hq_state: body.hqState ?? null,
    });

    if (insertError) {
      console.error("Failed to insert system", insertError);
      
      // Check for duplicate slug error
      if (insertError.code === "23505" || insertError.message.includes("unique")) {
        return NextResponse.json(
          { ok: false, error: "slug_already_exists" },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Systems API error:", error);
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

