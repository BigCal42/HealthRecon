import { z } from "zod";

/**
 * Centralized configuration module with Zod validation.
 * Validates all environment variables at startup and exports typed config.
 * Fails fast if any required variable is missing.
 */

const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // OpenAI App Key (required for app runtime)
  // Used by HealthRecon app for: chat, RAG, narratives, briefings, meeting prep, comparisons, signal actions
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // OpenAI Admin Key (optional, tooling only)
  // Used ONLY by Cursor MCP and local tooling scripts (NOT by deployed app)
  // Never exposed to client-side code or bundled in browser bundles
  OPENAI_ADMIN_KEY: z.string().optional(),

  // Firecrawl (required)
  FIRECRAWL_API_KEY: z.string().min(1, "FIRECRAWL_API_KEY is required"),
  FIRECRAWL_BASE_URL: z.string().url().optional().default("https://api.firecrawl.dev"),

  // Admin (optional)
  ADMIN_TOKEN: z.string().optional(),

  // Internal API (optional, for Phase 4)
  INTERNAL_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),

  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const rawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ADMIN_KEY: process.env.OPENAI_ADMIN_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    FIRECRAWL_BASE_URL: process.env.FIRECRAWL_BASE_URL,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    SENTRY_DSN: process.env.SENTRY_DSN,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.errors.map((err: { path: (string | number)[]; message: string }) => `${err.path.join(".")}: ${err.message}`).join("\n");
    throw new Error(`Environment variable validation failed:\n${errors}`);
  }

  return result.data;
}

// During Next.js build phase, env vars may not be available.
// Provide safe defaults for build-time analysis, but validate at runtime.
let rawConfig: EnvConfig;
try {
  rawConfig = validateEnv();
} catch (error) {
  // During build, if validation fails, provide minimal defaults to allow build to complete.
  // Runtime will still validate and fail fast if env vars are missing.
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-development-build") {
    rawConfig = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "placeholder-openai-key",
      OPENAI_ADMIN_KEY: process.env.OPENAI_ADMIN_KEY,
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || "placeholder-firecrawl-key",
      FIRECRAWL_BASE_URL: process.env.FIRECRAWL_BASE_URL || "https://api.firecrawl.dev",
      ADMIN_TOKEN: process.env.ADMIN_TOKEN,
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      SENTRY_DSN: process.env.SENTRY_DSN,
    };
  } else {
    // Not in build phase, re-throw the error
    throw error;
  }
}

/**
 * Structured configuration with separated OpenAI keys.
 * 
 * Key separation:
 * - openai.apiKey: Used by app runtime (chat, RAG, narratives, briefings, etc.)
 * - openaiAdmin.apiKey: Used ONLY by Cursor MCP and tooling scripts (never by deployed app)
 * 
 * IMPORTANT: openaiAdmin.apiKey must NEVER be:
 * - Exported to client-side code
 * - Used in route handlers or API routes
 * - Bundled in browser bundles
 * - Logged or exposed in any way
 */
export const config = {
  // Legacy flat structure (maintained for backward compatibility)
  ...rawConfig,
  
  // Structured OpenAI configuration
  openai: {
    apiKey: rawConfig.OPENAI_API_KEY,
  },
  
  openaiAdmin: {
    /**
     * Admin OpenAI key for tooling only.
     * 
     * WARNING: This key is ONLY for:
     * - Cursor MCP integration
     * - Local development tooling scripts
     * - Testing/config validation scripts
     * 
     * NEVER use this in:
     * - Route handlers (/app/api/*)
     * - Server components that render to client
     * - Any code that runs in production app runtime
     */
    apiKey: rawConfig.OPENAI_ADMIN_KEY ?? null,
  },

  sentry: {
    /**
     * Sentry DSN for error tracking (optional).
     * If not provided, error reporting gracefully degrades to logging only.
     */
    dsn: rawConfig.SENTRY_DSN ?? null,
    environment: rawConfig.NODE_ENV,
  },
} as const;

// Export typed config for convenience
export type Config = typeof config;

