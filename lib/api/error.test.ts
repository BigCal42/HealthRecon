import { describe, it, expect } from "vitest";
import { apiError, apiSuccess } from "./error";

describe("apiError", () => {
  it("creates error response with correct structure", async () => {
    const response = apiError(400, "validation_error", "Invalid input");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "validation_error",
        message: "Invalid input",
      },
    });
  });

  it("handles different status codes", async () => {
    const response404 = apiError(404, "not_found", "Resource not found");
    const response500 = apiError(500, "server_error", "Internal server error");

    expect(response404.status).toBe(404);
    expect(response500.status).toBe(500);
  });
});

describe("apiSuccess", () => {
  it("creates success response with correct structure", async () => {
    const data = { id: "123", name: "Test" };
    const response = apiSuccess(data);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data,
    });
  });

  it("handles custom status codes", async () => {
    const response = apiSuccess({ created: true }, 201);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
  });

  it("handles null and empty data", async () => {
    const responseNull = apiSuccess(null);
    const responseEmpty = apiSuccess({});

    const bodyNull = await responseNull.json();
    const bodyEmpty = await responseEmpty.json();

    expect(bodyNull.data).toBeNull();
    expect(bodyEmpty.data).toEqual({});
  });
});

