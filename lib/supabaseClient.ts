import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { config } from "./config";
import type { Database } from "./supabase.types";

export function createBrowserSupabaseClient() {
  return createClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let serverSupabaseClient: SupabaseClient<Database> | null = null;

export function createServerSupabaseClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServerSupabaseClient must only be used on the server");
  }

  if (!serverSupabaseClient) {
    serverSupabaseClient = createClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }

  return serverSupabaseClient;
}

/**
 * Create a Supabase client with service role key for admin operations.
 * Use this for operations that require elevated permissions (e.g., rate limiting).
 */
export function createServiceRoleSupabaseClient() {
  return createClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
}

