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

    const { data: interactions, error: interactionsError } = await supabase
      .from("interactions")
      .select("*")
      .eq("system_id", system.id)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (interactionsError) {
      logger.error(interactionsError, "Failed to fetch interactions");
      return NextResponse.json(
        { error: "fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ interactions: interactions ?? [] });
  } catch (error) {
    logger.error(error, "Interactions API error");
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
      occurredAt?: string;
      channel: string;
      subject: string;
      summary: string;
      nextStep?: string;
      nextStepDueAt?: string;
    };

    if (!body.slug || !body.channel || !body.subject || !body.summary) {
      return NextResponse.json(
        { ok: false, error: "slug, channel, subject, and summary are required" },
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

    const { error: insertError } = await supabase.from("interactions").insert({
      system_id: system.id,
      occurred_at: body.occurredAt
        ? new Date(body.occurredAt).toISOString()
        : new Date().toISOString(),
      channel: body.channel,
      subject: body.subject,
      summary: body.summary,
      next_step: body.nextStep ?? null,
      next_step_due_at: body.nextStepDueAt
        ? new Date(body.nextStepDueAt).toISOString()
        : null,
    });

    if (insertError) {
      logger.error(insertError, "Failed to insert interaction");
      return NextResponse.json(
        { ok: false, error: "insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error, "Interactions API error");
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

