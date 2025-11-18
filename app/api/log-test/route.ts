import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export function GET() {
  logger.info("Log test - info");
  logger.warn("Log test - warn");
  logger.error(new Error("Log test - error"));
  return NextResponse.json({ ok: true });
}

