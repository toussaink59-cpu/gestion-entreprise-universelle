import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

/**
 * Client hautement privilégié réservé aux Route Handlers/serveurs.
 * Ne jamais l'importer depuis un Client Component ni exposer sa clé au navigateur.
 */
export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("Service-role client is server-only");
  }

  const { supabaseUrl } = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
