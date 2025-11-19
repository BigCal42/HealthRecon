import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { config as appConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

const ADMIN_PREFIXES = ["/admin", "/api/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow /admin/login without authentication to prevent redirect loop
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const isAdminPath = ADMIN_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isAdminPath) {
    return NextResponse.next();
  }

  const token = appConfig.ADMIN_TOKEN;

  if (!token) {
    logger.error(new Error("ADMIN_TOKEN is not set"), "Admin configuration error");
    return new NextResponse("Admin configuration error", { status: 500 });
  }

  // Strategy: read from cookie "admin_token" and validate expiration
  const cookieValue = req.cookies.get("admin_token")?.value;

  if (!cookieValue) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Parse token data (may be old format string or new format JSON)
  let cookieToken: string;
  let expiresAt: number | undefined;

  try {
    const tokenData = JSON.parse(cookieValue) as { token?: string; expiresAt?: number };
    if (tokenData.token && typeof tokenData.expiresAt === "number") {
      // New format with expiration
      cookieToken = tokenData.token;
      expiresAt = tokenData.expiresAt;
    } else {
      // Fallback to old format (plain token string)
      cookieToken = cookieValue;
    }
  } catch {
    // Not JSON, treat as plain token (backward compatibility)
    cookieToken = cookieValue;
  }

  // Validate token matches
  if (cookieToken !== token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Validate expiration if present
  if (expiresAt !== undefined && Date.now() > expiresAt) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

