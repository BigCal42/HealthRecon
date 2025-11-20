import type { NextConfig } from "next";

/**
 * Next.js configuration for HealthRecon.
 * 
 * Runtime expectations:
 * - API routes use Node.js runtime (explicitly set via `export const runtime = "nodejs"`)
 * - Required for Supabase, OpenAI, and Firecrawl integrations which rely on Node.js APIs
 * - Edge runtime is not used for API routes to avoid compatibility issues
 */
const nextConfig: NextConfig = {};

export default nextConfig;

