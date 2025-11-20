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

/**
 * Validate admin authentication from cookie.
 * Used for protecting admin API routes.
 * 
 * @param request - Request object to check for admin cookie
 * @returns true if valid, throws apiError if invalid
 */
export function validateAdminAuth(request: Request): void {
  const adminToken = config.ADMIN_TOKEN;

  if (!adminToken) {
    throw apiError(500, "config_error", "Admin not configured");
  }

  // Get cookie from request headers (for API routes)
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    throw apiError(401, "unauthorized", "Admin authentication required");
  }

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...valueParts] = c.split("=");
      return [key, valueParts.join("=")];
    }),
  );

  const cookieValue = cookies.admin_token;
  if (!cookieValue) {
    throw apiError(401, "unauthorized", "Admin authentication required");
  }

  // Parse token data (may be old format string or new format JSON)
  let cookieToken: string;
  let expiresAt: number | undefined;

  try {
    const tokenData = JSON.parse(cookieValue) as { token?: string; expiresAt?: number };
    if (tokenData.token && typeof tokenData.expiresAt === "number") {
      // New format with expiration
      cookieToken = tokenData.token;
      expiresAt = tokenData.expiresAt;
    } else {
      // Fallback to old format (plain token string)
      cookieToken = cookieValue;
    }
  } catch {
    // Not JSON, treat as plain token (backward compatibility)
    cookieToken = cookieValue;
  }

  // Validate token matches
  if (cookieToken !== adminToken) {
    throw apiError(401, "unauthorized", "Invalid admin token");
  }

  // Validate expiration if present
  if (expiresAt !== undefined && Date.now() > expiresAt) {
    throw apiError(401, "unauthorized", "Admin token expired");
  }
}

