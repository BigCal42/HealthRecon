import OpenAI from "openai";

import { config } from "./config";
import { logger } from "./logger";

// Constants
const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000; // 1 second base delay

// Create OpenAI client with timeout configuration
// Uses APP key (config.openai.apiKey) - never uses admin key
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: config.openai.apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: 0, // We handle retries ourselves
  });
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop: string | symbol) {
    const client = getOpenAIClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

type ResponseFormat = "text" | "json_object";

export interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

export function extractTextFromResponse(response: OpenAIResponse): string | undefined {
  return response.output_text ?? response.output?.[0]?.content?.[0]?.text;
}

/**
 * Cap prompt length to prevent excessive token usage.
 * Rough estimate: 1 token ≈ 4 characters, so 50k chars ≈ 12.5k tokens
 */
export function capPromptLength(prompt: string, maxLength = 50_000): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  return prompt.substring(0, maxLength) + "\n\n[Prompt truncated due to length...]";
}

/**
 * Check if an error is retryable (5xx or network errors)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on 5xx errors or rate limits
    return error.status !== undefined && (error.status >= 500 || error.status === 429);
  }
  // Retry on network errors (timeout, connection errors, etc.)
  return error instanceof Error && (
    error.message.includes("timeout") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("ETIMEDOUT")
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  model?: string,
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        logger.info(`OpenAI ${operation} succeeded after ${attempt} retries`, { model, attempt });
      }
      return result;
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        throw error;
      }
      
      const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
      logger.warn(`OpenAI ${operation} failed, retrying in ${delay}ms`, {
        model,
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        error: error instanceof Error ? error.message : String(error),
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Create a response with retry logic, timeout, and logging
 */
export async function createResponse({
  prompt,
  format = "text",
  model = "gpt-4.1-mini",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  prompt: string;
  format?: ResponseFormat;
  model?: string;
  timeoutMs?: number;
}): Promise<OpenAIResponse> {
  const startTime = Date.now();
  
  try {
    const params: Record<string, unknown> = {
      model,
      input: prompt,
    };

    params["response_format"] = { type: format };

    const response = await withRetry(
      () => {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        return Promise.race([
          openai.responses.create(params as Parameters<typeof openai.responses.create>[0], {
            signal: controller.signal,
          }) as Promise<OpenAIResponse>,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
          }),
        ]).finally(() => clearTimeout(timeoutId));
      },
      "createResponse",
      model,
    );

    const duration = Date.now() - startTime;
    logger.info("OpenAI createResponse completed", {
      model,
      format,
      durationMs: duration,
      promptLength: prompt.length,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(error, "OpenAI createResponse failed", {
      model,
      format,
      durationMs: duration,
      promptLength: prompt.length,
    });
    throw error;
  }
}

/**
 * Generate JSON response with type safety and retry logic
 */
export async function generateJson<T>({
  prompt,
  model = "gpt-4.1-mini",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  prompt: string;
  model?: string;
  timeoutMs?: number;
}): Promise<T> {
  const response = await createResponse({
    prompt,
    format: "json_object",
    model,
    timeoutMs,
  });

  const text = extractTextFromResponse(response);
  if (!text) {
    throw new Error("No text in OpenAI response");
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    logger.error(error, "Failed to parse JSON from OpenAI response", { text });
    throw new Error("Invalid JSON in OpenAI response");
  }
}

/**
 * Generate embeddings with retry logic and logging
 */
export async function embedText({
  input,
  model = "text-embedding-3-small",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  input: string | string[];
  model?: string;
  timeoutMs?: number;
}): Promise<number[][]> {
  const startTime = Date.now();
  const isArray = Array.isArray(input);
  const inputLength = isArray ? input.length : 1;

  try {
    const response = await withRetry(
      () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        return Promise.race([
          openai.embeddings.create({
            model,
            input,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
          }),
        ]).finally(() => clearTimeout(timeoutId));
      },
      "embedText",
      model,
    );

    const duration = Date.now() - startTime;
    const embeddings = response.data.map((item) => item.embedding);
    
    logger.info("OpenAI embedText completed", {
      model,
      durationMs: duration,
      inputCount: inputLength,
      embeddingDimensions: embeddings[0]?.length ?? 0,
      totalTokens: response.usage?.total_tokens,
    });

    return embeddings;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(error, "OpenAI embedText failed", {
      model,
      durationMs: duration,
      inputCount: inputLength,
    });
    throw error;
  }
}

