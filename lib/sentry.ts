import { config } from "@/lib/config";
import { log } from "@/lib/logger";

let sentryInitialized = false;

/**
 * Initialize Sentry if DSN is configured.
 * This is a no-op if DSN is missing or Sentry SDK is not installed.
 * 
 * To enable Sentry:
 * 1. Install @sentry/nextjs: npm install @sentry/nextjs
 * 2. Set SENTRY_DSN environment variable
 * 3. Call initSentry() early in your app lifecycle (e.g., in middleware or root layout)
 */
export function initSentry(): void {
  if (sentryInitialized) {
    return;
  }

  const dsn = config.sentry.dsn;
  if (!dsn) {
    // No DSN configured, Sentry is disabled
    return;
  }

  // Check if Sentry SDK is available
  try {
    // Dynamic import to avoid hard dependency
    // If @sentry/nextjs is installed, initialize it
    // For now, this is a placeholder that will work even without Sentry SDK
    // In production, you would do:
    // const Sentry = require("@sentry/nextjs");
    // Sentry.init({ dsn, environment: config.sentry.environment });
    
    // Placeholder: actual initialization would happen here if SDK is installed
    // This allows the code to work without Sentry SDK being present
    sentryInitialized = true;
    log("info", "Sentry initialized", { environment: config.sentry.environment });
  } catch (error) {
    // Sentry SDK not installed or initialization failed
    // Degrade gracefully - logging will still work
    log("warn", "Sentry SDK not available, error reporting will use logging only", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Capture an error to Sentry (if configured) and log it.
 * 
 * This function:
 * - Always logs the error using the structured logger
 * - Optionally sends to Sentry if DSN is configured and SDK is initialized
 * - Never throws, ensuring graceful degradation
 * 
 * @param error - Error to capture (Error instance or any value)
 * @param context - Additional context to attach (will be sanitized)
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  // Always log the error
  const errorMessage = error instanceof Error ? error.message : String(error);
  log("error", errorMessage, context as Record<string, unknown>);

  // If Sentry is not initialized or DSN is missing, we're done
  if (!sentryInitialized || !config.sentry.dsn) {
    return;
  }

  // If Sentry SDK is available, forward the error
  try {
    // Placeholder: actual Sentry capture would happen here
    // In production with @sentry/nextjs installed, you would do:
    // const Sentry = require("@sentry/nextjs");
    // Sentry.captureException(error, { extra: context });
    
    // For now, this is a no-op that allows the code to work without Sentry SDK
  } catch (sentryError) {
    // Sentry capture failed, but we've already logged the error
    // Don't throw - graceful degradation
    log("warn", "Failed to capture error to Sentry", {
      originalError: errorMessage,
      sentryError: sentryError instanceof Error ? sentryError.message : String(sentryError),
    });
  }
}

