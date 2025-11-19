import { NextResponse } from "next/server";

import { classifySystem } from "@/lib/classifySystem";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, raw_text")
      .eq("source_type", "news")
      .is("system_id", null)
      .eq("processed", true);

    if (error) {
      logger.error(error, "Failed to load news documents");
      return NextResponse.json({ classified: 0 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ classified: 0 });
    }

    let classified = 0;

    for (const doc of docs) {
      if (!doc.raw_text) {
        continue;
      }

      try {
        const slug = await classifySystem(doc.raw_text, supabase);

        if (!slug) {
          continue;
        }

        const { data: system } = await supabase
          .from("systems")
          .select("id")
          .eq("slug", slug)
          .maybeSingle<{ id: string }>();

        if (!system) {
          continue;
        }

        const { error: updateError } = await supabase
          .from("documents")
          .update({ system_id: system.id })
          .eq("id", doc.id);

        if (updateError) {
          logger.error(updateError, "Failed to update document system_id", { documentId: doc.id });
          continue;
        }

        classified++;
      } catch (error) {
        logger.error(error, "Failed to classify document", { documentId: doc.id });
        continue;
      }
    }

    return NextResponse.json({ classified });
  } catch (error) {
    logger.error(error, "Classification error");
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

