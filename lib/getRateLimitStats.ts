import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleSupabaseClient } from "./supabaseClient";

export interface RateLimitStats {
  totalRequests: number;
  rateLimitHits: number;
  topEndpoints: Array<{ endpoint: string; requests: number; hits: number }>;
  recentHits: Array<{ key: string; count: number; limit: number; windowStart: string }>;
}

/**
 * Get rate limit statistics for monitoring and analytics.
 * 
 * @param supabase - Optional Supabase client
 * @param timeRangeHours - Hours to look back (default: 24)
 * @returns Rate limit statistics
 */
export async function getRateLimitStats(
  supabase?: SupabaseClient,
  timeRangeHours = 24,
): Promise<RateLimitStats> {
  const client = supabase ?? createServiceRoleSupabaseClient();
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

  // Get all rate limit records in the time range
  const { data: rateLimits } = await client
    .from("request_limits")
    .select("key, count, window_start")
    .gte("window_start", cutoffTime.toISOString())
    .returns<Array<{ key: string; count: number; window_start: string }>>();

  const totalRequests = rateLimits?.reduce((sum, r) => sum + r.count, 0) ?? 0;

  // Extract endpoints from rate limit keys (format: "endpoint:ip" or just "endpoint")
  const endpointStats = new Map<
    string,
    { requests: number; hits: number; limits: Map<string, { count: number; limit: number }> }
  >();

  // We need to estimate limits - typically 5 requests per minute for most endpoints
  // This is a heuristic since we don't store the limit in the table
  const defaultLimits: Record<string, number> = {
    chat: 5,
    "daily-briefing": 5,
    "sales-briefing": 5,
    ingest: 5,
    pipeline: 5,
    "news-ingest": 5,
    "system-profile": 5,
    compare: 5,
    "meeting-prep": 5,
    "account-plan": 5,
    "signal-actions": 5,
    search: 5,
    feedback: 20,
  };

  let rateLimitHits = 0;

  for (const rl of rateLimits ?? []) {
    const endpoint = rl.key.split(":")[0];
    const estimatedLimit = defaultLimits[endpoint] ?? 5;

    // If count equals or exceeds estimated limit, it's likely a hit
    // (We can't be 100% sure without storing the actual limit, but this is a good heuristic)
    const isLikelyHit = rl.count >= estimatedLimit * 0.9; // 90% of limit suggests it was hit

    if (!endpointStats.has(endpoint)) {
      endpointStats.set(endpoint, {
        requests: 0,
        hits: 0,
        limits: new Map(),
      });
    }

    const stats = endpointStats.get(endpoint)!;
    stats.requests += rl.count;

    // Track the highest count per endpoint as a proxy for hits
    const existingLimit = stats.limits.get(rl.window_start);
    if (!existingLimit || rl.count > existingLimit.count) {
      stats.limits.set(rl.window_start, {
        count: rl.count,
        limit: estimatedLimit,
      });
    }

    if (isLikelyHit) {
      stats.hits++;
      rateLimitHits++;
    }
  }

  // Convert to array and sort by requests
  const topEndpoints = Array.from(endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      requests: stats.requests,
      hits: stats.hits,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  // Get recent hits (windows where count is high)
  const recentHits: Array<{ key: string; count: number; limit: number; windowStart: string }> = [];
  for (const rl of rateLimits ?? []) {
    const endpoint = rl.key.split(":")[0];
    const estimatedLimit = defaultLimits[endpoint] ?? 5;
    if (rl.count >= estimatedLimit * 0.8) {
      recentHits.push({
        key: rl.key,
        count: rl.count,
        limit: estimatedLimit,
        windowStart: rl.window_start,
      });
    }
  }
  recentHits.sort((a, b) => new Date(b.windowStart).getTime() - new Date(a.windowStart).getTime());
  recentHits.splice(20); // Keep top 20

  return {
    totalRequests,
    rateLimitHits,
    topEndpoints,
    recentHits,
  };
}

