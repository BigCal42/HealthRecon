import { ZodError, type ZodType, z } from "zod";

import { apiError } from "./error";

const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

/**
 * Parse and validate JSON request body with Zod schema.
 * Enforces request size limits and provides standardized error responses.
 * 
 * @param req - Request object
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 * @throws Returns apiError response if validation fails
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T> {
  // Check content length if available
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
    throw apiError(413, "request_too_large", `Request body exceeds maximum size of ${MAX_REQUEST_SIZE} bytes`);
  }

  // Read body with size limit
  const bodyText = await req.text();
  
  if (bodyText.length > MAX_REQUEST_SIZE) {
    throw apiError(413, "request_too_large", `Request body exceeds maximum size of ${MAX_REQUEST_SIZE} bytes`);
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch (error) {
    throw apiError(400, "invalid_json", "Request body must be valid JSON");
  }

  try {
    return schema.parse(json) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue: { path: (string | number)[]; message: string }) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw apiError(400, "validation_error", `Validation failed: ${issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`);
    }
    throw apiError(400, "validation_error", "Validation failed");
  }
}

/**
 * Validate query parameters with Zod schema.
 * 
 * @param url - Request URL string
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated query parameters
 * @throws Returns apiError response if validation fails
 */
export function validateQuery<T extends ZodType<any, any, any>>(
  url: string,
  schema: T,
): z.infer<T> {
  const urlObj = new URL(url);
  const params: Record<string, string | string[]> = {};
  
  urlObj.searchParams.forEach((value, key) => {
    if (params[key]) {
      // Multiple values for same key - convert to array
      const existing = params[key];
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value];
    } else {
      params[key] = value;
    }
  });

  try {
    return schema.parse(params) as z.infer<T>;
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue: { path: (string | number)[]; message: string }) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw apiError(400, "validation_error", `Query validation failed: ${issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`);
    }
    throw apiError(400, "validation_error", "Query validation failed");
  }
}

