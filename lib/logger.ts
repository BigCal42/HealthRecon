export const logger = {
  info: (...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()}`, ...args);
  },

  warn: (...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()}`, ...args);
  },

  error: (err: any, ...args: any[]) => {
    console.error(
      `[ERROR] ${new Date().toISOString()}`,
      err?.message ?? err,
      ...(err?.stack ? [err.stack] : []),
      ...args,
    );
  },
};

