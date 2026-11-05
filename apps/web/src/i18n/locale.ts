export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en";
}

export function localeFrom(value: string | null | undefined): Locale {
  return isLocale(value) ? value : "fr";
}

export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : "/" + path;
  if (locale === "fr") return normalized;
  return normalized === "/" ? "/en" : "/en" + normalized;
}

/** Keep translated auth routes localized; untranslated workspace pages stay French. */
export function postAuthDestination(locale: Locale, safePath: string): string {
  if (locale === "fr") return safePath;
  const localizedPaths = ["/onboarding", "/reset-password"];
  if (localizedPaths.some((path) => safePath === path || safePath.startsWith(path + "?"))) {
    return localePath("en", safePath);
  }
  return localePath("en", "/workspace-language-notice") + "?continue=" + encodeURIComponent(safePath);
}
