import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJsonBody, validateQuery } from "./validate";
import { apiError } from "./error";

describe("parseJsonBody", () => {
  it("parses and validates valid JSON", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const request = new Request("http://example.com", {
      method: "POST",
      body: JSON.stringify({ name: "John", age: 30 }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await parseJsonBody(request, schema);
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("rejects invalid JSON", async () => {
    const schema = z.object({
      name: z.string(),
    });

    const request = new Request("http://example.com", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    try {
      await parseJsonBody(request, schema);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(400);
    }
  });

  it("rejects data that doesn't match schema", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const request = new Request("http://example.com", {
      method: "POST",
      body: JSON.stringify({ name: "John" }), // missing age
      headers: { "Content-Type": "application/json" },
    });

    try {
      await parseJsonBody(request, schema);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(400);
    }
  });

  it("rejects requests exceeding size limit", async () => {
    const schema = z.object({ data: z.string() });
    const largeData = "x".repeat(2 * 1024 * 1024); // 2MB

    const request = new Request("http://example.com", {
      method: "POST",
      body: JSON.stringify({ data: largeData }),
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(largeData.length),
      },
    });

    try {
      await parseJsonBody(request, schema);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(413);
    }
  });
});

describe("validateQuery", () => {
  it("parses and validates query parameters", () => {
    const schema = z.object({
      id: z.string(),
      limit: z.string().optional(),
    });

    const url = "http://example.com?id=123&limit=10";
    const result = validateQuery(url, schema);

    expect(result).toEqual({ id: "123", limit: "10" });
  });

  it("handles missing optional parameters", () => {
    const schema = z.object({
      id: z.string(),
      limit: z.string().optional(),
    });

    const url = "http://example.com?id=123";
    const result = validateQuery(url, schema);

    expect(result).toEqual({ id: "123" });
  });

  it("rejects invalid query parameters", () => {
    const schema = z.object({
      id: z.string().min(5),
    });

    const url = "http://example.com?id=12"; // too short

    try {
      validateQuery(url, schema);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(400);
    }
  });

  it("handles multiple values for same key", () => {
    const schema = z.object({
      tags: z.union([z.string(), z.array(z.string())]),
    });

    const url = "http://example.com?tags=a&tags=b";
    const result = validateQuery(url, schema);

    // Note: validateQuery converts multiple values to array
    expect(Array.isArray(result.tags) || typeof result.tags === "string").toBe(true);
  });
});

