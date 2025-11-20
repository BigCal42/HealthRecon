import { logger } from "./logger";

/**
 * Firecrawl API client for centralized crawling operations.
 * 
 * Provides typed helpers for interacting with the Firecrawl API,
 * with consistent error handling and logging.
 */

export type FirecrawlPage = {
  url: string;
  title?: string;
  content?: string;
};

export type FirecrawlResponse = {
  success: boolean;
  pages?: FirecrawlPage[];
  jobId?: string;
  error?: string;
};

export type FirecrawlOptions = {
  maxPages?: number;
  maxDepth?: number;
  timeout?: number;
  // Future: collectionId?: string;
};

import { config } from "./config";

function getFirecrawlConfig() {
  return {
    apiKey: config.FIRECRAWL_API_KEY,
    baseUrl: config.FIRECRAWL_BASE_URL,
  };
}

/**
 * Crawl a single URL using Firecrawl API.
 * 
 * This is a synchronous crawl that waits for results.
 * For async crawls with job status polling, use startCrawl() + getCrawlStatus().
 * 
 * @param url - The URL to crawl
 * @param options - Optional crawl configuration
 * @returns Firecrawl response with pages array
 * @throws Error if API key is not configured or request fails
 */
export async function crawlUrl(
  url: string,
  options?: FirecrawlOptions,
): Promise<FirecrawlResponse> {
  const { apiKey, baseUrl } = getFirecrawlConfig();

  const requestBody: Record<string, unknown> = { url };

  // Add optional parameters if provided
  if (options?.maxPages) {
    requestBody.maxPages = options.maxPages;
  }
  if (options?.maxDepth) {
    requestBody.maxDepth = options.maxDepth;
  }

  try {
    const response = await fetch(`${baseUrl}/v1/crawl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: options?.timeout
        ? AbortSignal.timeout(options.timeout * 1000)
        : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      logger.error(
        new Error(`Firecrawl API error: ${response.status} ${errorText}`),
        "Firecrawl request failed",
        { url, status: response.status },
      );
      throw new Error(`Firecrawl request failed: ${response.status}`);
    }

    const payload = (await response.json()) as FirecrawlResponse;

    if (!payload.success) {
      logger.warn("Firecrawl crawl unsuccessful", { url, error: payload.error });
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(error, "Firecrawl request timeout", { url });
      throw new Error(`Firecrawl request timeout for ${url}`);
    }
    logger.error(error, "Firecrawl request error", { url });
    throw error;
  }
}

/**
 * Start an async crawl job (if Firecrawl supports async operations).
 * 
 * Currently not implemented - Firecrawl API uses synchronous crawls.
 * This function is a placeholder for future async support.
 * 
 * @param url - The URL to crawl
 * @param options - Optional crawl configuration
 * @returns Job ID for status polling
 */
export async function startCrawl(
  url: string,
  options?: FirecrawlOptions,
): Promise<{ jobId: string }> {
  // Future implementation for async crawls
  throw new Error("Async crawls not yet supported by Firecrawl API");
}

/**
 * Get status of an async crawl job.
 * 
 * Currently not implemented - Firecrawl API uses synchronous crawls.
 * This function is a placeholder for future async support.
 * 
 * @param jobId - The crawl job ID
 * @returns Crawl status and results if complete
 */
export async function getCrawlStatus(jobId: string): Promise<FirecrawlResponse> {
  // Future implementation for async crawls
  throw new Error("Async crawls not yet supported by Firecrawl API");
}

