/**
 * Client-side logger wrapper for browser environments.
 * Provides a simple interface compatible with server-side logger patterns.
 */

export function log(level: "debug" | "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  // Skip debug logs in production
  if (level === "debug" && process.env.NODE_ENV === "production") {
    return;
  }

  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  const logMessage = `[${level.toUpperCase()}] ${message}${contextStr}`;

  switch (level) {
    case "debug":
      console.debug(logMessage);
      break;
    case "info":
      console.log(logMessage);
      break;
    case "warn":
      console.warn(logMessage);
      break;
    case "error":
      console.error(logMessage);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void => {
    log("debug", message, context);
  },
  info: (message: string, context?: Record<string, unknown>): void => {
    log("info", message, context);
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    log("warn", message, context);
  },
  error: (err: unknown, message?: string, context?: Record<string, unknown>): void => {
    const error = err instanceof Error ? err : new Error(String(err));
    const errorMessage = message ?? error.message;
    log("error", errorMessage, { ...context, error: error.message });
  },
};

