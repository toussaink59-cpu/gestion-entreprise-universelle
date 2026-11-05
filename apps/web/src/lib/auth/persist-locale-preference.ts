import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/locale";

/**
 * Persist the locale selected by the authenticated user.
 *
 * Preference persistence must never turn an otherwise successful sign-in or
 * confirmation callback into an authentication failure.
 */
export async function persistLocalePreference(
  supabase: SupabaseClient,
  userId: string,
  locale: Locale,
): Promise<void> {
  try {
    const { error } = await supabase
      .from("users")
      .update({ preferred_locale: locale })
      .eq("id", userId);

    if (error) {
      console.error("User locale preference update failed:", {
        code: error.code ?? "unknown",
      });
    }
  } catch {
    // Avoid logging request details, credentials or personal information.
    console.error("User locale preference update failed");
  }
}
