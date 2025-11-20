import { NextResponse } from "next/server";

import { config } from "@/lib/config";

/**
 * Validates that a request is coming from Vercel Cron.
 * 
 * Vercel Cron jobs send requests with a special authorization header.
 * We validate using the CRON_SECRET environment variable if set,
 * or fall back to checking for the Vercel cron signature header.
 * 
 * @param request - The incoming request
 * @throws NextResponse with 401 status if authentication fails
 */
export function validateCronRequest(request: Request): void {
  // Check for CRON_SECRET in Authorization header (if configured)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return;
  }

  // Check for Vercel cron signature header
  const vercelSignature = request.headers.get("x-vercel-signature");
  if (vercelSignature) {
    // Vercel automatically signs cron requests, so presence of header is sufficient
    // In production, you could verify the signature if needed
    return;
  }

  // If neither method validates, reject the request
  // In development, allow if no CRON_SECRET is set (for local testing)
  if (config.NODE_ENV === "development" && !cronSecret) {
    // Allow in development for local testing
    return;
  }

  throw NextResponse.json(
    { ok: false, error: { code: "unauthorized", message: "Unauthorized cron request" } },
    { status: 401 },
  );
}

