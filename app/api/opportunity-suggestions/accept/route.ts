import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = (await request.json().catch(() => null)) as {
      slug?: string;
      suggestionId?: string;
    } | null;

    const slug = body?.slug;
    const suggestionId = body?.suggestionId;

    if (!slug || !suggestionId) {
      return NextResponse.json(
        { ok: false, error: "slug_and_suggestion_required" },
        { status: 400 },
      );
    }

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return NextResponse.json({ ok: false, error: "system_not_found" }, { status: 404 });
    }

    const { data: suggestion, error: suggestionError } = await supabase
      .from("opportunity_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .maybeSingle<{
        id: string;
        system_id: string;
        title: string;
        description: string | null;
        source_kind: string | null;
        accepted: boolean;
      }>();

    if (suggestionError || !suggestion || suggestion.system_id !== system.id) {
      return NextResponse.json(
        { ok: false, error: "suggestion_not_found" },
        { status: 404 },
      );
    }

    if (suggestion.accepted) {
      return NextResponse.json({ ok: true, opportunityId: suggestionId });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("opportunities")
      .insert({
        system_id: system.id,
        title: suggestion.title,
        description: suggestion.description,
        status: "open",
        source_kind: suggestion.source_kind,
        source_id: suggestion.id,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (insertError || !inserted) {
      logger.error(insertError, "Failed to create opportunity from suggestion");
      return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("opportunity_suggestions")
      .update({
        accepted: true,
        accepted_opportunity_id: inserted.id,
      })
      .eq("id", suggestionId);

    if (updateError) {
      logger.error(updateError, "Failed to mark suggestion accepted");
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, opportunityId: inserted.id });
  } catch (error) {
    logger.error(error, "Opportunity suggestion accept error");
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}

