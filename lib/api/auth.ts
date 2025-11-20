import { apiError } from "./error";
import { config } from "../config";

/**
 * Validate internal API key from request headers.
 * Used for protecting sensitive routes like ingestion, pipeline, and embedding.
 * 
 * @param request - Request object to check for API key header
 * @returns true if valid, throws apiError if invalid
 */
export function validateInternalApiKey(request: Request): void {
  const apiKey = request.headers.get("x-internal-api-key");

  if (!config.INTERNAL_API_KEY) {
    throw apiError(500, "config_error", "Internal API key not configured");
  }

  if (!apiKey || apiKey !== config.INTERNAL_API_KEY) {
    throw apiError(401, "unauthorized", "Invalid or missing internal API key");
  }
}

