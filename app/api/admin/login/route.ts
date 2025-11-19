import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token: string;
      from: string;
    };

    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
      return NextResponse.json(
        { ok: false, error: "Admin not configured" },
        { status: 500 },
      );
    }

    if (body.token !== adminToken) {
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    const redirectTo = body.from || "/admin/systems";

    const response = NextResponse.json({
      ok: true,
      redirectTo,
    });

    // Set cookie: HttpOnly, Secure, SameSite=Lax
    response.cookies.set("admin_token", adminToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    logger.error(error, "Login API error");
    return NextResponse.json(
      { ok: false, error: "unexpected_error" },
      { status: 500 },
    );
  }
}

