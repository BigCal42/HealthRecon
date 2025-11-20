export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  route?: string;
  systemSlug?: string;
  systemId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Sanitize context to prevent logging secrets or sensitive data
 */
function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const sanitized: LogContext = {};
  const sensitiveKeys = [
    "password",
    "secret",
    "token",
    "key",
    "apiKey",
    "authorization",
    "cookie",
    "body",
    "requestBody",
  ];

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log entry with structured data
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error,
): string {
  const timestamp = new Date().toISOString();
  const entry: Record<string, unknown> = {
    level,
    timestamp,
    message,
  };

  const sanitized = sanitizeContext(context);
  if (sanitized) {
    Object.assign(entry, sanitized);
  }

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return JSON.stringify(entry);
}

/**
 * Centralized logging function with structured output.
 * 
 * In development: logs all levels including debug.
 * In production: logs info, warn, and error (no debug).
 * 
 * Never logs secrets, env vars, or full request bodies.
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  // Skip debug logs in production
  if (level === "debug" && process.env.NODE_ENV === "production") {
    return;
  }

  const formatted = formatLogEntry(level, message, context);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

/**
 * Legacy logger object for backward compatibility.
 * Prefer using the `log()` function directly.
 * 
 * @deprecated Use `log()` function instead
 */
export const logger = {
  debug: (message: string, context?: LogContext): void => {
    log("debug", message, context);
  },
  info: (message: string, context?: LogContext): void => {
    log("info", message, context);
  },
  warn: (message: string, context?: LogContext): void => {
    log("warn", message, context);
  },
  error: (err: unknown, message?: string, context?: LogContext): void => {
    const error = err instanceof Error ? err : new Error(String(err));
    const errorMessage = message ?? error.message;
    log("error", errorMessage, context);
  },
};

