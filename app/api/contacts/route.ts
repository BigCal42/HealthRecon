import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody, validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = createRequestContext("/api/contacts");
  ctx.logInfo("Contacts fetch request received");

  try {
    const contactsGetSchema = z.object({
      slug: z.string().min(1).max(100),
      limit: z.string().transform((val) => parseInt(val, 10)).default("50"),
      offset: z.string().transform((val) => parseInt(val, 10)).default("0"),
    });

    const validated = validateQuery(request.url, contactsGetSchema);
    const slug = validated.slug;
    const limit = validated.limit;
    const offset = validated.offset;

    // Enforce reasonable limits
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
    }

    const { data: contacts, error: contactsError, count } = await supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("system_id", system.id)
      .order("is_primary", { ascending: false })
      .order("seniority", { ascending: true })
      .order("full_name", { ascending: true })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (contactsError) {
      ctx.logError(contactsError, "Failed to fetch contacts", { slug, limit: safeLimit, offset: safeOffset });
      return apiError(500, "fetch_failed", "Failed to fetch contacts");
    }

    ctx.logInfo("Contacts fetched successfully", { slug, count: contacts?.length ?? 0 });
    return apiSuccess({
      contacts: contacts ?? [],
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total: count ?? 0,
        hasMore: (count ?? 0) > safeOffset + safeLimit,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Contacts API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/contacts");
  ctx.logInfo("Contact creation request received");

  try {
    const postSchema = z.object({
      slug: z.string().min(1).max(100),
      fullName: z.string().min(1).max(200),
      title: z.string().max(200).optional(),
      department: z.string().max(200).optional(),
      email: z.string().email().max(200).optional(),
      phone: z.string().max(50).optional(),
      seniority: z.enum(["executive", "director", "manager", "individual_contributor"]).optional(),
      roleInDeal: z.string().max(100).optional(),
      notes: z.string().max(2000).optional(),
      isPrimary: z.boolean().optional(),
    });

    const body = await parseJsonBody(request, postSchema);

    const supabase = createServerSupabaseClient();

    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("id")
      .eq("slug", body.slug)
      .maybeSingle<{ id: string }>();

    if (systemError || !system) {
      return apiError(404, "system_not_found", "System not found");
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
      ctx.logError(insertError, "Failed to insert contact", { slug: body.slug, systemId: system.id });
      return apiError(500, "insert_failed", "Failed to insert contact");
    }

    ctx.logInfo("Contact created successfully", { slug: body.slug, systemId: system.id });
    return apiSuccess({});
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    ctx.logError(error, "Contacts API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

