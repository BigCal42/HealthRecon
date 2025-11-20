import { apiSuccess } from "@/lib/api/error";
import { logger } from "@/lib/logger";

// Use Node.js runtime for logger integration
export const runtime = "nodejs";

export function GET() {
  logger.info("Log test - info");
  logger.warn("Log test - warn");
  logger.error(new Error("Log test - error"));
  return apiSuccess({});
}

