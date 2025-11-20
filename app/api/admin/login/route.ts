import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { parseJsonBody } from "@/lib/api/validate";
import { config } from "@/lib/config";

// Use Node.js runtime for config access
export const runtime = "nodejs";

const loginSchema = z.object({
  token: z.string().min(1),
  from: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/admin/login");
  ctx.logInfo("Admin login request received");

  try {
    const body = await parseJsonBody(request, loginSchema);

    const adminToken = config.ADMIN_TOKEN;

    if (!adminToken) {
      ctx.logError(new Error("Admin token not configured"), "Admin not configured");
      return apiError(500, "config_error", "Admin not configured");
    }

    if (body.token !== adminToken) {
      ctx.logError(new Error("Invalid token provided"), "Invalid token");
      return apiError(401, "invalid_token", "Invalid token");
    }

    const redirectTo = body.from || "/admin/systems";

    const response = apiSuccess({ redirectTo });

    // Create token with expiration (24 hours from now)
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const tokenData = {
      token: adminToken,
      expiresAt,
    };

    // Set cookie: HttpOnly, Secure, SameSite=Lax, with expiration
    response.cookies.set("admin_token", JSON.stringify(tokenData), {
      path: "/",
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    });

    ctx.logInfo("Admin login successful", { redirectTo });
    return response;
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    ctx.logError(error, "Login API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

