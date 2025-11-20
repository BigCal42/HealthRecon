import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect } from "vitest";
import { getSystemTimeline, type TimelineItem } from "./getSystemTimeline";

function createMockSupabase(overrides: {
  system?: { id: string; slug: string; name: string } | null;
  systemError?: Error | null;
  signals?: Array<{
    id: string;
    system_id: string;
    summary: string | null;
    category: string | null;
    severity: string | null;
    created_at: string;
  }>;
  signalsError?: Error | null;
  interactions?: Array<{
    id: string;
    system_id: string;
    channel: string;
    subject: string | null;
    summary: string | null;
    occurred_at: string;
    next_step_due_at: string | null;
  }>;
  interactionsError?: Error | null;
  workItems?: Array<{
    id: string;
    system_id: string;
    source_type: string;
    status: string;
    title: string;
    description: string | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  workItemsError?: Error | null;
  opportunities?: Array<{
    id: string;
    system_id: string;
    title: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  opportunitiesError?: Error | null;
} = {}): SupabaseClient {
  const {
    system = { id: "sys1", slug: "bilh", name: "BILH" },
    systemError = null,
    signals = [],
    signalsError = null,
    interactions = [],
    interactionsError = null,
    workItems = [],
    workItemsError = null,
    opportunities = [],
    opportunitiesError = null,
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
              gte: () => ({
                returns: () =>
                  Promise.resolve({
                    data: signals,
                    error: signalsError,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "interactions") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                returns: () =>
                  Promise.resolve({
                    data: interactions,
                    error: interactionsError,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "work_items") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                returns: () =>
                  Promise.resolve({
                    data: workItems,
                    error: workItemsError,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "opportunities") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                returns: () =>
                  Promise.resolve({
                    data: opportunities,
                    error: opportunitiesError,
                  }),
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

describe("getSystemTimeline", () => {
  it("returns null when system is not found", async () => {
    const supabase = createMockSupabase({
      system: null,
      systemError: new Error("Not found"),
    });

    const result = await getSystemTimeline(supabase, "nonexistent");

    expect(result).toBeNull();
  });

  it("merges and sorts items by occurredAt", async () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");
    const day1 = new Date("2024-01-10T00:00:00Z");
    const day2 = new Date("2024-01-12T00:00:00Z");
    const day3 = new Date("2024-01-14T00:00:00Z");

    const supabase = createMockSupabase({
      signals: [
        {
          id: "sig1",
          system_id: "sys1",
          summary: "Signal 1",
          category: "news",
          severity: "high",
          created_at: day2.toISOString(),
        },
      ],
      interactions: [
        {
          id: "ix1",
          system_id: "sys1",
          channel: "email",
          subject: "Interaction 1",
          summary: "Summary",
          occurred_at: day1.toISOString(),
          next_step_due_at: null,
        },
      ],
      workItems: [
        {
          id: "wi1",
          system_id: "sys1",
          source_type: "signal",
          status: "open",
          title: "Work Item 1",
          description: "Description",
          due_at: null,
          created_at: day3.toISOString(),
          updated_at: day3.toISOString(),
        },
      ],
      opportunities: [
        {
          id: "opp1",
          system_id: "sys1",
          title: "Opportunity 1",
          status: "open",
          created_at: day1.toISOString(),
          updated_at: day2.toISOString(),
        },
      ],
    });

    const result = await getSystemTimeline(supabase, "bilh");

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(4);

    // Should be sorted by occurredAt ascending
    expect(result?.items[0].occurredAt).toBe(day1.toISOString());
    expect(result?.items[1].occurredAt).toBe(day1.toISOString()); // opportunity uses created_at
    expect(result?.items[2].occurredAt).toBe(day2.toISOString());
    expect(result?.items[3].occurredAt).toBe(day3.toISOString());
  });

  it("maps signals correctly", async () => {
    const supabase = createMockSupabase({
      signals: [
        {
          id: "sig1",
          system_id: "sys1",
          summary: "Test signal",
          category: "news",
          severity: "high",
          created_at: new Date("2024-01-10T00:00:00Z").toISOString(),
        },
      ],
    });

    const result = await getSystemTimeline(supabase, "bilh");

    const signalItem = result?.items.find((i) => i.type === "signal");
    expect(signalItem).toBeDefined();
    expect(signalItem?.id).toBe("sig1");
    expect(signalItem?.title).toBe("Test signal");
    expect(signalItem?.meta?.category).toBe("news");
    expect(signalItem?.meta?.severity).toBe("high");
  });

  it("maps interactions correctly", async () => {
    const supabase = createMockSupabase({
      interactions: [
        {
          id: "ix1",
          system_id: "sys1",
          channel: "email",
          subject: "Meeting",
          summary: "Discussed project",
          occurred_at: new Date("2024-01-10T00:00:00Z").toISOString(),
          next_step_due_at: new Date("2024-01-15T00:00:00Z").toISOString(),
        },
      ],
    });

    const result = await getSystemTimeline(supabase, "bilh");

    const interactionItem = result?.items.find((i) => i.type === "interaction");
    expect(interactionItem).toBeDefined();
    expect(interactionItem?.id).toBe("ix1");
    expect(interactionItem?.title).toBe("Meeting");
    expect(interactionItem?.description).toBe("Discussed project");
    expect(interactionItem?.meta?.channel).toBe("email");
  });

  it("maps work items correctly", async () => {
    const supabase = createMockSupabase({
      workItems: [
        {
          id: "wi1",
          system_id: "sys1",
          source_type: "signal",
          status: "open",
          title: "Follow up",
          description: "Task description",
          due_at: new Date("2024-01-20T00:00:00Z").toISOString(),
          created_at: new Date("2024-01-10T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-11T00:00:00Z").toISOString(),
        },
      ],
    });

    const result = await getSystemTimeline(supabase, "bilh");

    const workItem = result?.items.find((i) => i.type === "work_item");
    expect(workItem).toBeDefined();
    expect(workItem?.id).toBe("wi1");
    expect(workItem?.title).toBe("Follow up");
    expect(workItem?.meta?.status).toBe("open");
    expect(workItem?.meta?.sourceType).toBe("signal");
  });

  it("maps opportunities correctly", async () => {
    const supabase = createMockSupabase({
      opportunities: [
        {
          id: "opp1",
          system_id: "sys1",
          title: "Deal 1",
          status: "open",
          created_at: new Date("2024-01-10T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-12T00:00:00Z").toISOString(),
        },
      ],
    });

    const result = await getSystemTimeline(supabase, "bilh");

    const oppItem = result?.items.find((i) => i.type === "opportunity");
    expect(oppItem).toBeDefined();
    expect(oppItem?.id).toBe("opp1");
    expect(oppItem?.title).toBe("Deal 1");
    expect(oppItem?.description).toBe("open");
    expect(oppItem?.meta?.status).toBe("open");
    // Should use updated_at if available
    expect(oppItem?.occurredAt).toBe(new Date("2024-01-12T00:00:00Z").toISOString());
  });

  it("handles errors gracefully and continues with partial data", async () => {
    const supabase = createMockSupabase({
      signalsError: new Error("Database error"),
      interactions: [
        {
          id: "ix1",
          system_id: "sys1",
          channel: "email",
          subject: "Test",
          summary: null,
          occurred_at: new Date("2024-01-10T00:00:00Z").toISOString(),
          next_step_due_at: null,
        },
      ],
    });

    const result = await getSystemTimeline(supabase, "bilh");

    // Should still return result with interactions even though signals failed
    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].type).toBe("interaction");
  });

  it("respects limit option", async () => {
    const baseDate = new Date("2024-01-10T00:00:00Z");
    const signals = Array.from({ length: 10 }, (_, i) => ({
      id: `sig${i}`,
      system_id: "sys1",
      summary: `Signal ${i}`,
      category: "news",
      severity: "high",
      created_at: new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const supabase = createMockSupabase({ signals });

    const result = await getSystemTimeline(supabase, "bilh", { limit: 5 });

    expect(result?.items).toHaveLength(5);
    // Should return most recent items (last 5)
    expect(result?.items[0].id).toBe("sig5");
    expect(result?.items[4].id).toBe("sig9");
  });
});

