import { log } from "./logger";

/**
 * Track error occurrence for monitoring and analytics.
 * Logs errors with structured context for analysis.
 * 
 * @param endpoint - The API endpoint or route where error occurred
 * @param error - The error object
 * @param context - Additional context about the error
 */
export async function trackError(
  endpoint: string,
  error: Error | unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log the error
  log("error", `Error in ${endpoint}`, {
    endpoint,
    errorMessage,
    errorStack,
    ...context,
  });

  // Errors are tracked via logging and can be analyzed from logs
}

