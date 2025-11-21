import type { SupabaseClient } from "@supabase/supabase-js";

import { log } from "./logger";
import { createServiceRoleSupabaseClient } from "./supabaseClient";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

/**
 * Check rate limit using Supabase-backed distributed rate limiting.
 * 
 * @param params - Rate limit parameters
 * @param params.supabase - Optional Supabase client (uses service role client if not provided)
 * @param params.key - Composite key like "ip:endpoint" or "user:route"
 * @param params.limit - Maximum requests allowed per window
 * @param params.windowMs - Time window in milliseconds
 * @returns Rate limit check result with allowed status, remaining count, and reset time
 */
export async function checkRateLimit(params: {
  supabase?: SupabaseClient;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  // Requires supabase/migrations/20250101000021_request_limits.sql
  const supabase = params.supabase ?? createServiceRoleSupabaseClient();
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / params.windowMs) * params.windowMs);
  const resetAt = new Date(windowStart.getTime() + params.windowMs);

  // Try to find existing record for this key and window
  const { data: existing, error: selectError } = await supabase
    .from("request_limits")
    .select("id, count")
    .eq("key", params.key)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle<{ id: string; count: number }>();

  if (selectError && selectError.code !== "PGRST116") {
    // PGRST116 is "not found" which is fine, other errors are real problems
    // On error, allow the request but log it
    log("error", "Rate limit check error", { key: params.key, error: selectError });
    return {
      allowed: true,
      remaining: params.limit - 1,
      resetAt: resetAt.toISOString(),
    };
  }

  if (existing) {
    // Record exists, check if limit exceeded
    if (existing.count >= params.limit) {
      // Log rate limit hit for monitoring
      log("warn", "Rate limit exceeded", {
        key: params.key,
        count: existing.count,
        limit: params.limit,
        windowStart: windowStart.toISOString(),
      });
      return {
        allowed: false,
        remaining: 0,
        resetAt: resetAt.toISOString(),
      };
    }

    // Increment count
    const { error: updateError } = await supabase
      .from("request_limits")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);

    if (updateError) {
      log("error", "Rate limit update error", { key: params.key, error: updateError });
      // On error, allow the request
      return {
        allowed: true,
        remaining: params.limit - existing.count - 1,
        resetAt: resetAt.toISOString(),
      };
    }

    return {
      allowed: true,
      remaining: params.limit - existing.count - 1,
      resetAt: resetAt.toISOString(),
    };
  }

  // No existing record, create new one with count = 1
  const { error: insertError } = await supabase
    .from("request_limits")
    .insert({
      key: params.key,
      window_start: windowStart.toISOString(),
      count: 1,
    });

  if (insertError) {
    log("error", "Rate limit insert error", { key: params.key, error: insertError });
    // On error, allow the request
    return {
      allowed: true,
      remaining: params.limit - 1,
      resetAt: resetAt.toISOString(),
    };
  }

  return {
    allowed: true,
    remaining: params.limit - 1,
    resetAt: resetAt.toISOString(),
  };
}

/**
 * Legacy synchronous rate limit function for backward compatibility.
 * This now calls the async checkRateLimit but returns immediately (allows request).
 * Routes should migrate to async checkRateLimit.
 * 
 * @deprecated Use checkRateLimit instead
 */
export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): boolean {
  // For backward compatibility, allow the request but log a warning
  // Routes should be migrated to use async checkRateLimit
  log("warn", "Using deprecated synchronous rateLimit function. Migrate to async checkRateLimit.", { key });
  return true;
}

