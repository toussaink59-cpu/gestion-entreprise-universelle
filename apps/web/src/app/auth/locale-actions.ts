"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, localeSwitcherPath } from "@/i18n/locale";
import type { Locale } from "@/i18n/locale";
import { readStringField } from "@/lib/security/form-validation";

const switchableRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/workspace-language-notice",
]);

export async function setLocalePreference(formData: FormData): Promise<void> {
  const requestedLocale = readStringField(formData, "locale");
  const requestedRoute = readStringField(formData, "route");

  if (!isLocale(requestedLocale) || !requestedRoute || !switchableRoutes.has(requestedRoute)) {
    redirect("/login?error=invalid-locale-selection");
  }

  const locale: Locale = requestedLocale;
  const cookieStore = await cookies();
  cookieStore.set("polygest-locale", locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (user && !authError) {
    const { error } = await supabase
      .from("users")
      .update({ preferred_locale: locale })
      .eq("id", user.id);

    if (error) {
      // Keep language switching available via the functional cookie, while
      // emitting only a safe error code for operational diagnosis.
      console.error("Locale preference update failed:", { code: error.code });
    }
  }

  redirect(localeSwitcherPath(locale, requestedRoute));
}
