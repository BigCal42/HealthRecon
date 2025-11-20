import { log } from "@/lib/logger";

/**
 * Capture an error and log it.
 * 
 * This function logs errors using the structured logger.
 * If Sentry SDK is installed and configured in the future, it can be enhanced
 * to also send errors to Sentry.
 * 
 * @param error - Error to capture (Error instance or any value)
 * @param context - Additional context to attach
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  log("error", errorMessage, context as Record<string, unknown>);
}

