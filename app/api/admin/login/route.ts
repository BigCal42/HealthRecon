import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/error";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token: string;
      from: string;
    };

    const adminToken = config.ADMIN_TOKEN;

    if (!adminToken) {
      return apiError(500, "config_error", "Admin not configured");
    }

    if (body.token !== adminToken) {
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

    return response;
  } catch (error) {
    logger.error(error, "Login API error");
    return apiError(500, "unexpected_error", "An unexpected error occurred");
  }
}

