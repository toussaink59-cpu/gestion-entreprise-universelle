import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  localeFrom,
  localePath,
  postAuthDestination,
} from "@/i18n/locale";
import { persistLocalePreference } from "@/lib/auth/persist-locale-preference";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).origin;
  const locale = localeFrom(url.searchParams.get("locale"));
  const next = getSafeRedirectPath(url.searchParams.get("next"));
  const failure = new URL(
    localePath(locale, "/login") + "?error=confirmation-failed",
    origin,
  );
  const code = url.searchParams.get("code");

  if (!code) return NextResponse.redirect(failure);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return NextResponse.redirect(failure);

  // The callback completes account confirmation (or recovery). Persist the
  // locale captured when the flow started so the profile matches the UI.
  if (data.user) {
    await persistLocalePreference(supabase, data.user.id, locale);
  }

  return NextResponse.redirect(
    new URL(postAuthDestination(locale, next), origin),
  );
}
