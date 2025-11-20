import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect } from "vitest";
import { getSystemInsights } from "./getSystemInsights";

function createMockSupabase(overrides: {
  system?: { id: string; slug: string; name: string } | null;
  systemError?: Error | null;
  signals?: Array<{
    id: string;
    category: string | null;
    severity: string | null;
    created_at: string;
  }>;
  signalActions?: Array<{
    id: string;
    created_at: string;
  }>;
  opportunities?: Array<{
    id: string;
    stage: string | null;
    amount: number | null;
    currency: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    close_date: string | null;
  }>;
  workItems?: Array<{
    id: string;
    status: string;
    created_at: string;
    updated_at: string | null;
  }>;
  interactions?: Array<{
    id: string;
    occurred_at: string;
  }>;
} = {}): SupabaseClient {
  const {
    system = { id: "sys1", slug: "bilh", name: "BILH" },
    systemError = null,
    signals = [],
    signalActions = [],
    opportunities = [],
    workItems = [],
    interactions = [],
  } = overrides;

  return {
    from: (table: string) => {
      if (table === "systems") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: system,
                  error: systemError,
                }),
            }),
          }),
        };
      }
      if (table === "signals") {
        return {
          select: () => ({
            eq: () => ({
              gte: () =>
                Promise.resolve({
                  data: signals,
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "signal_actions") {
        return {
          select: () => ({
            eq: () => ({
              gte: () =>
                Promise.resolve({
                  data: signalActions,
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "opportunities") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: opportunities,
                error: null,
              }),
          }),
        };
      }
      if (table === "work_items") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: workItems,
                error: null,
              }),
          }),
        };
      }
      if (table === "interactions") {
        return {
          select: () => ({
            eq: () => ({
              gte: () =>
                Promise.resolve({
                  data: interactions,
                  error: null,
                }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          returns: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe("getSystemInsights", () => {
  it("returns null when system is not found", async () => {
    const supabase = createMockSupabase({
      system: null,
      systemError: new Error("Not found"),
    });

    const result = await getSystemInsights(supabase, "nonexistent");

    expect(result).toBeNull();
  });

  it("computes signal metrics correctly", async () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");
    const windowStart = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const supabase = createMockSupabase({
      signals: [
        {
          id: "sig1",
          category: "news",
          severity: "high",
          created_at: new Date(windowStart.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "sig2",
          category: "news",
          severity: "medium",
          created_at: new Date(windowStart.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "sig3",
          category: "product",
          severity: "high",
          created_at: new Date(windowStart.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "sig4",
          category: null,
          severity: null,
          created_at: new Date(windowStart.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      signalActions: [
        {
          id: "sa1",
          created_at: new Date(windowStart.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "sa2",
          created_at: new Date(windowStart.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result).not.toBeNull();
    expect(result?.signals.total).toBe(4);
    expect(result?.signals.byCategory["news"]).toBe(2);
    expect(result?.signals.byCategory["product"]).toBe(1);
    expect(result?.signals.byCategory["uncategorized"]).toBe(1);
    expect(result?.signals.bySeverity["high"]).toBe(2);
    expect(result?.signals.bySeverity["medium"]).toBe(1);
    expect(result?.signals.bySeverity["unknown"]).toBe(1);
    expect(result?.signals.actions.totalSignalActions).toBe(2);
    expect(result?.signals.actions.followThroughRate).toBe(0.5); // 2 actions / 4 signals
  });

  it("computes follow-through rate as null when no signals", async () => {
    const supabase = createMockSupabase({
      signals: [],
      signalActions: [
        {
          id: "sa1",
          created_at: new Date("2024-01-10T00:00:00Z").toISOString(),
        },
      ],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result?.signals.total).toBe(0);
    expect(result?.signals.actions.followThroughRate).toBeNull();
  });

  it("computes opportunity metrics correctly", async () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");
    const windowStart = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const supabase = createMockSupabase({
      opportunities: [
        {
          id: "opp1",
          stage: "prospecting",
          amount: 10000,
          currency: "USD",
          status: "open",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          close_date: null,
        },
        {
          id: "opp2",
          stage: "closed_won",
          amount: 5000,
          currency: "USD",
          status: "closed",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-10T00:00:00Z").toISOString(),
          close_date: new Date(windowStart.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "opp3",
          stage: "closed_lost",
          amount: 3000,
          currency: "USD",
          status: "closed",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-05T00:00:00Z").toISOString(),
          close_date: new Date(windowStart.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "opp4",
          stage: "negotiation",
          amount: null,
          currency: null,
          status: "open",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          close_date: null,
        },
      ],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result?.opportunities.total).toBe(4);
    expect(result?.opportunities.byStage["prospecting"]).toBe(1);
    expect(result?.opportunities.byStage["negotiation"]).toBe(1);
    expect(result?.opportunities.byStage["closed_won"]).toBe(1);
    expect(result?.opportunities.byStage["closed_lost"]).toBe(1);
    // Open pipeline: opp1 (10000) + opp4 (null, excluded) = 10000
    expect(result?.opportunities.openPipelineAmount).toBe(10000);
    // Closed won in window: opp2 (5000)
    expect(result?.opportunities.closedWonAmountLastWindow).toBe(5000);
    // Closed lost in window: opp3 (3000)
    expect(result?.opportunities.closedLostAmountLastWindow).toBe(3000);
  });

  it("handles null amounts in opportunities", async () => {
    const supabase = createMockSupabase({
      opportunities: [
        {
          id: "opp1",
          stage: "prospecting",
          amount: null,
          currency: null,
          status: "open",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          close_date: null,
        },
      ],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result?.opportunities.openPipelineAmount).toBeNull();
  });

  it("computes work items metrics correctly", async () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");
    const windowStart = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const supabase = createMockSupabase({
      workItems: [
        {
          id: "wi1",
          status: "open",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
        },
        {
          id: "wi2",
          status: "snoozed",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
        },
        {
          id: "wi3",
          status: "done",
          created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
          updated_at: new Date(windowStart.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "wi4",
          status: "done",
          created_at: new Date("2023-12-01T00:00:00Z").toISOString(),
          updated_at: new Date("2023-12-01T00:00:00Z").toISOString(),
        },
        {
          id: "wi5",
          status: "done",
          created_at: new Date(windowStart.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: null,
        },
      ],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result?.work.openWorkItems).toBe(2); // open + snoozed
    expect(result?.work.completedWorkItemsLastWindow).toBe(2); // wi3 (updated in window) + wi5 (created in window)
  });

  it("computes interactions metrics correctly", async () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");
    const windowStart = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const supabase = createMockSupabase({
      interactions: [
        {
          id: "ix1",
          occurred_at: new Date(windowStart.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "ix2",
          occurred_at: new Date(windowStart.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "ix3",
          occurred_at: new Date(windowStart.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result?.interactions.totalLastWindow).toBe(3);
    expect(result?.interactions.lastInteractionAt).toBe(
      new Date(windowStart.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    );
  });

  it("handles empty interactions", async () => {
    const supabase = createMockSupabase({
      interactions: [],
    });

    const result = await getSystemInsights(supabase, "bilh");

    expect(result?.interactions.totalLastWindow).toBe(0);
    expect(result?.interactions.lastInteractionAt).toBeNull();
  });

  it("respects windowDays option", async () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");
    const window30Start = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const window90Start = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const supabase = createMockSupabase({
      signals: [
        {
          id: "sig1",
          category: "news",
          severity: "high",
          created_at: new Date(window30Start.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "sig2",
          category: "news",
          severity: "high",
          created_at: new Date(window90Start.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });

    const result30 = await getSystemInsights(supabase, "bilh", { windowDays: 30 });
    const result90 = await getSystemInsights(supabase, "bilh", { windowDays: 90 });

    expect(result30?.signals.total).toBe(1);
    expect(result90?.signals.total).toBe(2);
    expect(result30?.windowDays).toBe(30);
    expect(result90?.windowDays).toBe(90);
  });
});

