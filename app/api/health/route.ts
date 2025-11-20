import { apiSuccess } from "@/lib/api/error";
import { createRequestContext } from "@/lib/apiLogging";
import { config } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

// Use Node.js runtime for Supabase integration
export const runtime = "nodejs";

interface HealthStatus {
  ok: boolean;
  timestamp: string;
  services: {
    supabase: {
      status: "ok" | "error";
      latency?: number;
      error?: string;
    };
    openai: {
      configured: boolean;
      status?: "ok" | "error";
      latency?: number;
      error?: string;
    };
    firecrawl: {
      configured: boolean;
      status?: "ok" | "error";
      error?: string;
    };
  };
  version?: string;
}

export async function GET(): Promise<NextResponse> {
  const ctx = createRequestContext("/api/health");
  ctx.logInfo("Health check request received");

  const healthStatus: HealthStatus = {
    ok: true,
    timestamp: new Date().toISOString(),
    services: {
      supabase: { status: "error" },
      openai: { configured: false },
      firecrawl: { configured: false },
    },
  };

  // Check Supabase connectivity
  const supabase = createServerSupabaseClient();
  const supabaseStart = Date.now();
  try {
    const { error: systemsError } = await supabase
      .from("systems")
      .select("id")
      .limit(1);

    const supabaseLatency = Date.now() - supabaseStart;
    healthStatus.services.supabase = {
      status: !systemsError ? "ok" : "error",
      latency: supabaseLatency,
      error: systemsError?.message,
    };
  } catch (error) {
    const supabaseLatency = Date.now() - supabaseStart;
    healthStatus.services.supabase = {
      status: "error",
      latency: supabaseLatency,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check OpenAI configuration and availability
  healthStatus.services.openai.configured = !!config.openai.apiKey;
  if (healthStatus.services.openai.configured) {
    try {
      // Simple validation: check if API key format looks valid
      const apiKey = config.openai.apiKey;
      const isValidFormat = apiKey.startsWith("sk-") && apiKey.length > 20;
      healthStatus.services.openai.status = isValidFormat ? "ok" : "error";
      if (!isValidFormat) {
        healthStatus.services.openai.error = "Invalid API key format";
      }
    } catch (error) {
      healthStatus.services.openai.status = "error";
      healthStatus.services.openai.error = error instanceof Error ? error.message : String(error);
    }
  } else {
    healthStatus.services.openai.status = "error";
    healthStatus.services.openai.error = "API key not configured";
  }

  // Check Firecrawl configuration
  healthStatus.services.firecrawl.configured = !!config.FIRECRAWL_API_KEY;
  if (!healthStatus.services.firecrawl.configured) {
    healthStatus.services.firecrawl.status = "error";
    healthStatus.services.firecrawl.error = "API key not configured";
  } else {
    // Firecrawl API key format validation
    const apiKey = config.FIRECRAWL_API_KEY;
    const isValidFormat = apiKey.length > 10; // Basic validation
    healthStatus.services.firecrawl.status = isValidFormat ? "ok" : "error";
    if (!isValidFormat) {
      healthStatus.services.firecrawl.error = "Invalid API key format";
    }
  }

  // Overall health status
  healthStatus.ok =
    healthStatus.services.supabase.status === "ok" &&
    healthStatus.services.openai.configured &&
    healthStatus.services.openai.status === "ok" &&
    healthStatus.services.firecrawl.configured &&
    healthStatus.services.firecrawl.status === "ok";

  // Add version info if available
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    healthStatus.version = process.env.NEXT_PUBLIC_APP_VERSION;
  }

  const statusCode = healthStatus.ok ? 200 : 503;
  return new NextResponse(JSON.stringify(healthStatus), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

