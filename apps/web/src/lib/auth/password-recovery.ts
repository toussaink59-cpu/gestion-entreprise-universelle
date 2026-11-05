import type { Locale } from "@/i18n/locale";

/** Build a same-origin PKCE callback from the configured public application URL. */
export function buildPasswordRecoveryCallbackUrl(
  configuredAppUrl: string | undefined,
  locale: Locale,
): string {
  const appOrigin = new URL(configuredAppUrl ?? "http://localhost:3000").origin;
  const callbackUrl = new URL("/auth/callback", appOrigin);
  callbackUrl.searchParams.set("next", "/reset-password");
  callbackUrl.searchParams.set("locale", locale);
  return callbackUrl.toString();
}
