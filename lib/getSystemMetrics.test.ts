import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect } from "vitest";

import { getSystemMetrics } from "./getSystemMetrics";

type TableName =
  | "systems"
  | "documents"
  | "signals"
  | "opportunities"
  | "pipeline_runs"
  | "daily_briefing_runs";

type TableData = Record<TableName, any[]>;

function createMockSupabase(overrides: Partial<TableData> = {}) {
  const tables: TableData = {
    systems: [
      { id: "s1", slug: "bilh", name: "BILH", website: "https://bilh.org" },
      { id: "s2", slug: "mgh", name: "MGH", website: null },
    ],
    documents: [
      { system_id: "s1" },
      { system_id: "s1" },
      { system_id: "s1" },
    ],
    signals: [{ system_id: "s1" }],
    opportunities: [{ system_id: "s1" }],
    pipeline_runs: [
      { system_id: "s1", created_at: "2024-02-01T00:00:00Z" },
      { system_id: "s1", created_at: "2024-01-01T00:00:00Z" },
    ],
    daily_briefing_runs: [
      { system_id: "s1", created_at: "2024-02-05T00:00:00Z" },
    ],
    ...overrides,
  } as TableData;

  const makeQuery = (rows: any[]) => {
    const response = Promise.resolve({ data: rows, error: null });

    return {
      order: () => ({
        returns: () => response,
      }),
      returns: () => response,
    };
  };

  return {
    from(table: TableName) {
      return {
        select: () => makeQuery(tables[table] ?? []),
      };
    },
  } as unknown as SupabaseClient;
}

describe("getSystemMetrics", () => {
  it("combines counts and timestamps into metrics", async () => {
    const supabase = createMockSupabase();

    const metrics = await getSystemMetrics(supabase);

    expect(metrics).toHaveLength(2);

    const bilh = metrics.find((m) => m.slug === "bilh");
    expect(bilh).toBeDefined();
    expect(bilh?.documentCount).toBe(3);
    expect(bilh?.signalCount).toBe(1);
    expect(bilh?.opportunityCount).toBe(1);
    expect(bilh?.lastPipelineRunAt).toBe("2024-02-01T00:00:00Z");
    expect(bilh?.lastDailyBriefingAt).toBe("2024-02-05T00:00:00Z");
  });

  it("defaults counts and dates when data is missing", async () => {
    const supabase = createMockSupabase({
      documents: [{ system_id: "s1" }],
      signals: [],
      opportunities: [],
      pipeline_runs: [],
      daily_briefing_runs: [],
    });

    const metrics = await getSystemMetrics(supabase);

    const mgh = metrics.find((m) => m.slug === "mgh");
    expect(mgh).toBeDefined();
    expect(mgh?.documentCount).toBe(0);
    expect(mgh?.signalCount).toBe(0);
    expect(mgh?.opportunityCount).toBe(0);
    expect(mgh?.lastPipelineRunAt).toBeNull();
    expect(mgh?.lastDailyBriefingAt).toBeNull();
  });

  it("returns empty array when there are no systems", async () => {
    const supabase = createMockSupabase({ systems: [] });

    const metrics = await getSystemMetrics(supabase);

    expect(metrics).toEqual([]);
  });
});

