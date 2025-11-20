import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit } from "./rateLimit";

// Mock Supabase client
function createMockSupabase(overrides: {
  existing?: { id: string; count: number } | null;
  selectError?: Error | null;
  updateError?: Error | null;
  insertError?: Error | null;
} = {}): SupabaseClient {
  const { existing = null, selectError = null, updateError = null, insertError = null } = overrides;

  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => {
              if (selectError) {
                return Promise.resolve({ data: null, error: selectError });
              }
              return Promise.resolve({ data: existing, error: null });
            },
          }),
        }),
      }),
      update: () => ({
        eq: () => {
          if (updateError) {
            return Promise.resolve({ error: updateError });
          }
          return Promise.resolve({ error: null });
        },
      }),
      insert: () => {
        if (insertError) {
          return Promise.resolve({ error: insertError });
        }
        return Promise.resolve({ error: null });
      },
    }),
  } as unknown as SupabaseClient;
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows request when no existing record", async () => {
    const supabase = createMockSupabase({ existing: null });
    const result = await checkRateLimit({
      supabase,
      key: "test:key",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows request when count is below limit", async () => {
    const supabase = createMockSupabase({
      existing: { id: "123", count: 3 },
    });

    const result = await checkRateLimit({
      supabase,
      key: "test:key",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1); // 5 - 3 - 1 = 1
  });

  it("blocks request when count exceeds limit", async () => {
    const supabase = createMockSupabase({
      existing: { id: "123", count: 5 },
    });

    const result = await checkRateLimit({
      supabase,
      key: "test:key",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows request on database error (fail open)", async () => {
    const supabase = createMockSupabase({
      selectError: new Error("Database error"),
    });

    const result = await checkRateLimit({
      supabase,
      key: "test:key",
      limit: 5,
      windowMs: 60_000,
    });

    // Should fail open (allow request) on error
    expect(result.allowed).toBe(true);
  });

  it("calculates reset time correctly", async () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    const supabase = createMockSupabase({ existing: null });

    const result = await checkRateLimit({
      supabase,
      key: "test:key",
      limit: 5,
      windowMs: 60_000, // 1 minute
    });

    expect(result.resetAt).toBeDefined();
    const resetTime = new Date(result.resetAt);
    expect(resetTime.getTime()).toBeGreaterThan(Date.now());
  });
});

