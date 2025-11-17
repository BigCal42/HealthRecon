import { NextResponse } from "next/server";

import { BILH_SLUG } from "@/config/constants";
import { getSystemContext } from "@/lib/getSystemContext";
import { createResponse } from "@/lib/openaiClient";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

type ComparisonResult = {
  systemA: { summary: string };
  systemB: { summary: string };
  similarities: string[];
  differences: string[];
  opportunities_for_systemA: string[];
  opportunities_for_systemB: string[];
};

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    let systemA: string | undefined;
    let systemB: string | undefined;

    try {
      const body = (await request.json()) as { systemA?: string; systemB?: string };
      systemA = body.systemA;
      systemB = body.systemB;
    } catch {
      // Ignore invalid JSON, use defaults
    }

    // Default systemA to "bilh"
    if (!systemA) {
      systemA = BILH_SLUG;
    }

    // Default systemB to first system not equal to "bilh"
    if (!systemB) {
      const { data: systems } = await supabase
        .from("systems")
        .select("slug")
        .neq("slug", systemA)
        .limit(1);

      if (!systems || systems.length === 0) {
        return NextResponse.json(
          { error: "system_not_found" },
          { status: 404 },
        );
      }

      systemB = systems[0].slug;
    }

    // Look up both systems
    const [{ data: systemARow, error: systemAError }, { data: systemBRow, error: systemBError }] =
      await Promise.all([
        supabase
          .from("systems")
          .select("id, slug, name")
          .eq("slug", systemA)
          .maybeSingle<{ id: string; slug: string; name: string }>(),
        supabase
          .from("systems")
          .select("id, slug, name")
          .eq("slug", systemB)
          .maybeSingle<{ id: string; slug: string; name: string }>(),
      ]);

    if (systemAError || !systemARow) {
      return NextResponse.json(
        { error: "system_not_found" },
        { status: 404 },
      );
    }

    if (systemBError || !systemBRow) {
      return NextResponse.json(
        { error: "system_not_found" },
        { status: 404 },
      );
    }

    // Get contexts for both systems
    const [contextA, contextB] = await Promise.all([
      getSystemContext(supabase, systemARow.id),
      getSystemContext(supabase, systemBRow.id),
    ]);

    // Prepare context strings, trim to 20k chars each
    const contextAStr = JSON.stringify(contextA);
    const contextBStr = JSON.stringify(contextB);

    const trimmedContextA = contextAStr.length > 20000 ? contextAStr.substring(0, 20000) : contextAStr;
    const trimmedContextB = contextBStr.length > 20000 ? contextBStr.substring(0, 20000) : contextBStr;

    // Build prompt
    const prompt = [
      "You are a healthcare intelligence analyst. Provide a structured JSON comparison of two healthcare systems based on their signals, entities, and news. Return only valid JSON.",
      `System A name: ${contextA.system.name}`,
      `System B name: ${contextB.system.name}`,
      "Context for System A:",
      trimmedContextA,
      "Context for System B:",
      trimmedContextB,
      "Provide a JSON object with the following structure:",
      "{",
      '  "systemA": { "summary": "brief summary of system A" },',
      '  "systemB": { "summary": "brief summary of system B" },',
      '  "similarities": ["similarity 1", "similarity 2", ...],',
      '  "differences": ["difference 1", "difference 2", ...],',
      '  "opportunities_for_systemA": ["opportunity 1", "opportunity 2", ...],',
      '  "opportunities_for_systemB": ["opportunity 1", "opportunity 2", ...]',
      "}",
    ].join("\n\n");

    // Call OpenAI
    const response = await createResponse({
      prompt,
      format: "json_object",
    });

    const rawOutput =
      (response as any)?.output_text ??
      (response as any)?.output?.[0]?.content?.[0]?.text;

    if (!rawOutput) {
      return NextResponse.json(
        { error: "model_failure" },
        { status: 502 },
      );
    }

    let parsed: ComparisonResult;

    try {
      parsed = JSON.parse(rawOutput) as ComparisonResult;
    } catch (error) {
      console.error("Failed to parse model output", error, rawOutput);
      return NextResponse.json(
        { error: "model_failure" },
        { status: 502 },
      );
    }

    // Validate structure
    if (
      !parsed.systemA ||
      !parsed.systemB ||
      !Array.isArray(parsed.similarities) ||
      !Array.isArray(parsed.differences) ||
      !Array.isArray(parsed.opportunities_for_systemA) ||
      !Array.isArray(parsed.opportunities_for_systemB)
    ) {
      return NextResponse.json(
        { error: "model_failure" },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Compare systems error:", error);
    return NextResponse.json(
      { error: "model_failure" },
      { status: 500 },
    );
  }
}

