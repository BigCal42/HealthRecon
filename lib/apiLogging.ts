import { log, type LogContext } from "@/lib/logger";
import { captureError } from "@/lib/sentry";

/**
 * Request-level logging context for API routes.
 * Provides consistent request ID generation and logging helpers.
 */
export interface RequestContext {
  requestId: string;
  route: string;
  logInfo(message: string, extra?: Record<string, unknown>): void;
  logError(error: unknown, message: string, extra?: Record<string, unknown>): void;
}

/**
 * Create a request context for API route handlers.
 * Generates a unique request ID and provides logging helpers.
 * 
 * @param route - Route path (e.g., "/api/pipeline")
 * @returns Request context with logging helpers
 */
export function createRequestContext(route: string): RequestContext {
  // Use crypto.randomUUID() if available (Node 20+), otherwise fallback
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  return {
    requestId,
    route,
    logInfo(message: string, extra?: Record<string, unknown>): void {
      const context: LogContext = {
        requestId,
        route,
        ...extra,
      };
      log("info", message, context);
    },
    logError(error: unknown, message: string, extra?: Record<string, unknown>): void {
      const context: LogContext = {
        requestId,
        route,
        ...extra,
      };
      log("error", message, context);
      captureError(error, { requestId, route, ...extra });
    },
  };
}

