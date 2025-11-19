type Loggable = string | number | boolean | null | undefined | Error | Record<string, unknown>;

export const logger = {
  info: (...args: Loggable[]): void => {
    console.log(`[INFO] ${new Date().toISOString()}`, ...args);
  },

  warn: (...args: Loggable[]): void => {
    console.warn(`[WARN] ${new Date().toISOString()}`, ...args);
  },

  error: (err: unknown, ...args: Loggable[]): void => {
    const errorMessage =
      err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[ERROR] ${new Date().toISOString()}`,
      errorMessage,
      ...(errorStack ? [errorStack] : []),
      ...args,
    );
  },
};

