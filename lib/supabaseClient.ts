import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export function createBrowserSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

