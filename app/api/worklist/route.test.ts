import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkItems, createWorkItemFromFocus } from "@/lib/worklist";
import { checkRateLimit } from "@/lib/rateLimit";
import { createRequestContext } from "@/lib/apiLogging";

const SYSTEM_ID = "11111111-1111-1111-1111-111111111111";
const FOCUS_ID = "22222222-2222-2222-2222-222222222222";

// Mock dependencies
vi.mock("@/lib/worklist", () => ({
  getWorkItems: vi.fn(),
  createWorkItemFromFocus: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  createServerSupabaseClient: vi.fn(() => ({} as SupabaseClient)),
}));

vi.mock("@/lib/apiLogging", () => ({
  createRequestContext: vi.fn(() => ({
    requestId: "test-request-id",
    route: "/api/worklist",
    logInfo: vi.fn(),
    logError: vi.fn(),
  })),
}));

describe("/api/worklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date().toISOString(),
    });
  });

  describe("GET", () => {
    it("returns work items successfully", async () => {
      const mockItems = [
        {
          id: "wi1",
          system_id: SYSTEM_ID,
          source_type: "signal_action",
          source_id: FOCUS_ID,
          title: "Follow up",
          description: "Check status",
          status: "open" as const,
          due_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      vi.mocked(getWorkItems).mockResolvedValue(mockItems);

      const request = new Request("http://localhost/api/worklist", {
        method: "GET",
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.items).toEqual(mockItems);
      expect(getWorkItems).toHaveBeenCalled();
    });

    it("filters by status when provided", async () => {
      vi.mocked(getWorkItems).mockResolvedValue([]);

      const request = new Request("http://localhost/api/worklist?status=open", {
        method: "GET",
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(getWorkItems).toHaveBeenCalledWith(expect.anything(), { status: "open" });
    });

    it("returns rate limit error when exceeded", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date().toISOString(),
      });

      const request = new Request("http://localhost/api/worklist", {
        method: "GET",
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("rate_limited");
      expect(getWorkItems).not.toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      vi.mocked(getWorkItems).mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/worklist", {
        method: "GET",
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("unexpected_error");
    });
  });

  describe("POST", () => {
    it("creates work item from focus item successfully", async () => {
      const mockWorkItem = {
        id: "wi1",
        system_id: SYSTEM_ID,
        source_type: "signal_action",
        source_id: FOCUS_ID,
        title: "Follow up",
        description: "Check status",
        status: "open",
        due_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(createWorkItemFromFocus).mockResolvedValue(mockWorkItem);

      const request = new Request("http://localhost/api/worklist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          fromFocusItem: {
            id: FOCUS_ID,
            type: "signal_action",
            systemId: SYSTEM_ID,
            title: "Follow up",
            description: "Check status",
          },
          defaultDueDays: 7,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.item).toBeDefined();
      expect(createWorkItemFromFocus).toHaveBeenCalled();
    });

    it("rejects invalid payload", async () => {
      const request = new Request("http://localhost/api/worklist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          fromFocusItem: {
            // Missing required fields
            id: FOCUS_ID,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.ok).toBe(false);
      expect(createWorkItemFromFocus).not.toHaveBeenCalled();
    });

    it("returns rate limit error when exceeded", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date().toISOString(),
      });

      const request = new Request("http://localhost/api/worklist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          fromFocusItem: {
            id: FOCUS_ID,
            type: "signal_action",
            systemId: SYSTEM_ID,
            title: "Follow up",
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("rate_limited");
    });

    it("handles errors gracefully", async () => {
      vi.mocked(createWorkItemFromFocus).mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/worklist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          fromFocusItem: {
            id: FOCUS_ID,
            type: "signal_action",
            systemId: SYSTEM_ID,
            title: "Follow up",
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("unexpected_error");
    });
  });
});

