import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleSupabaseClient } from "./supabaseClient";

export interface AnalyticsData {
  openai: {
    estimatedCalls: number;
    estimatedCost: number;
    modelBreakdown: Record<string, number>;
  };
  ingestion: {
    totalDocuments: number;
    documentsLast24h: number;
    systemsProcessed: number;
    averageDocumentsPerSystem: number;
  };
  briefings: {
    totalBriefings: number;
    briefingsLast24h: number;
    successRate: number;
    systemsWithBriefings: number;
  };
  systems: {
    totalSystems: number;
    systemsWithSeeds: number;
    systemsWithDocuments: number;
    systemsWithSignals: number;
  };
  rateLimits: {
    totalRequests: number;
    rateLimitHits: number;
    topEndpoints: Array<{ endpoint: string; requests: number }>;
  };
  errors: {
    totalErrors: number;
    errorsLast24h: number;
    topErrorEndpoints: Array<{ endpoint: string; count: number }>;
  };
  timestamp: string;
}

/**
 * Get comprehensive analytics data for the admin dashboard.
 * 
 * @param supabase - Optional Supabase client
 * @returns Analytics data summary
 */
export async function getAnalytics(supabase?: SupabaseClient): Promise<AnalyticsData> {
  const client = supabase ?? createServiceRoleSupabaseClient();
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get system counts
  const { data: systems } = await client
    .from("systems")
    .select("id")
    .returns<Array<{ id: string }>>();

  const totalSystems = systems?.length ?? 0;

  // Get systems with active seeds
  const { data: systemsWithSeeds } = await client
    .from("system_seeds")
    .select("system_id")
    .eq("active", true);

  const uniqueSystemsWithSeeds = new Set(systemsWithSeeds?.map((s) => s.system_id) ?? []).size;

  // Get document statistics
  const { data: allDocuments } = await client
    .from("documents")
    .select("id, system_id, crawled_at")
    .returns<Array<{ id: string; system_id: string | null; crawled_at: string | null }>>();

  const totalDocuments = allDocuments?.length ?? 0;
  const documentsLast24h = allDocuments?.filter((d) => {
    if (!d.crawled_at) return false;
    const crawledAt = new Date(d.crawled_at);
    return crawledAt >= last24h;
  }).length ?? 0;

  const systemsWithDocuments = new Set(allDocuments?.map((d) => d.system_id).filter(Boolean) ?? []).size;

  // Get signal statistics
  const { data: signals } = await client
    .from("signals")
    .select("system_id")
    .returns<Array<{ system_id: string }>>();

  const systemsWithSignals = new Set(signals?.map((s) => s.system_id) ?? []).size;

  // Get briefing statistics
  const { data: allBriefings } = await client
    .from("daily_briefings")
    .select("id, system_id, created_at")
    .returns<Array<{ id: string; system_id: string; created_at: string | null }>>();

  const totalBriefings = allBriefings?.length ?? 0;
  const briefingsLast24h = allBriefings?.filter((b) => {
    if (!b.created_at) return false;
    const createdAt = new Date(b.created_at);
    return createdAt >= last24h;
  }).length ?? 0;

  const systemsWithBriefings = new Set(allBriefings?.map((b) => b.system_id) ?? []).size;

  // Get briefing run statistics for success rate
  const { data: briefingRuns } = await client
    .from("daily_briefing_runs")
    .select("status")
    .returns<Array<{ status: string }>>();

  const totalRuns = briefingRuns?.length ?? 0;
  const successfulRuns = briefingRuns?.filter((r) => r.status === "success").length ?? 0;
  const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

  // Get rate limit statistics
  const { data: rateLimits } = await client
    .from("request_limits")
    .select("key, count")
    .returns<Array<{ key: string; count: number }>>();

  const totalRequests = rateLimits?.reduce((sum, r) => sum + r.count, 0) ?? 0;

  // Extract endpoints from rate limit keys (format: "endpoint:ip" or just "endpoint")
  const endpointCounts = new Map<string, number>();
  for (const rl of rateLimits ?? []) {
    const endpoint = rl.key.split(":")[0];
    endpointCounts.set(endpoint, (endpointCounts.get(endpoint) ?? 0) + rl.count);
  }

  const topEndpoints = Array.from(endpointCounts.entries())
    .map(([endpoint, requests]) => ({ endpoint, requests }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  // Estimate OpenAI usage (rough estimate based on document and briefing counts)
  // This is a placeholder - actual usage would come from OpenAI API logs or tracking
  const estimatedCalls = totalBriefings * 2 + totalDocuments * 0.1; // Rough estimate
  const estimatedCost = estimatedCalls * 0.0001; // Very rough estimate ($0.0001 per call)

  // Calculate average documents per system
  const systemsProcessed = systemsWithDocuments;
  const averageDocumentsPerSystem = systemsProcessed > 0 ? totalDocuments / systemsProcessed : 0;

  return {
    openai: {
      estimatedCalls: Math.round(estimatedCalls),
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      modelBreakdown: {
        "gpt-4.1-mini": Math.round(estimatedCalls * 0.8),
        "text-embedding-3-small": Math.round(estimatedCalls * 0.2),
      },
    },
    ingestion: {
      totalDocuments,
      documentsLast24h,
      systemsProcessed,
      averageDocumentsPerSystem: Math.round(averageDocumentsPerSystem * 10) / 10,
    },
    briefings: {
      totalBriefings,
      briefingsLast24h,
      successRate: Math.round(successRate * 10) / 10,
      systemsWithBriefings,
    },
    systems: {
      totalSystems,
      systemsWithSeeds: uniqueSystemsWithSeeds,
      systemsWithDocuments,
      systemsWithSignals,
    },
    rateLimits: {
      totalRequests,
      rateLimitHits: 0, // Placeholder - would need to track rate limit rejections
      topEndpoints,
    },
    errors: {
      totalErrors: 0, // Placeholder - would come from error tracking
      errorsLast24h: 0,
      topErrorEndpoints: [], // Placeholder
    },
    timestamp: now.toISOString(),
  };
}

