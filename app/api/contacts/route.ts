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

    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("*")
      .eq("system_id", system.id)
      .order("is_primary", { ascending: false })
      .order("seniority", { ascending: true })
      .order("full_name", { ascending: true });

    if (contactsError) {
      console.error("Failed to fetch contacts", contactsError);
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ contacts: contacts ?? [] });
  } catch (error) {
    console.error("Contacts API error:", error);
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
      fullName: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      seniority?: string;
      roleInDeal?: string;
      notes?: string;
      isPrimary?: boolean;
    };

    if (!body.slug || !body.fullName) {
      return NextResponse.json(
        { ok: false, error: "slug and fullName are required" },
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

    const { error: insertError } = await supabase.from("contacts").insert({
      system_id: system.id,
      full_name: body.fullName,
      title: body.title ?? null,
      department: body.department ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      seniority: body.seniority ?? null,
      role_in_deal: body.roleInDeal ?? null,
      notes: body.notes ?? null,
      is_primary: !!body.isPrimary,
    });

    if (insertError) {
      console.error("Failed to insert contact", insertError);
      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contacts API error:", error);
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

