"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

export function createClient() {
  const { supabaseUrl, publishableKey } =
    getSupabasePublicConfig();

  return createBrowserClient(supabaseUrl, publishableKey);
}