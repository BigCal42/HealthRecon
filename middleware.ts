import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  const token = process.env.ADMIN_TOKEN;

  if (!token) {
    logger.error(new Error("ADMIN_TOKEN is not set"), "Admin configuration error");
    return new NextResponse("Admin configuration error", { status: 500 });
  }

  // Strategy: read from cookie "admin_token"
  const cookieToken = req.cookies.get("admin_token")?.value;

  if (cookieToken !== token) {
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

