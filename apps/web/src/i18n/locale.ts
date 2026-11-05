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

export function localeSwitcherPath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : "/" + path;

  // The language notice exists only under the explicit [locale] segment;
  // unlike the auth pages, it has no French unprefixed route alias.
  if (locale === "fr" && normalized === "/workspace-language-notice") {
    return "/fr/workspace-language-notice";
  }

  return localePath(locale, normalized);
}

/** Keep translated auth routes localized; untranslated workspace pages stay French. */
export function postAuthDestination(locale: Locale, safePath: string): string {
  if (locale === "fr") return safePath;
  if (safePath === "/invitations/accept" || safePath.startsWith("/invitations/accept?")) {
    return /[?&]locale=(fr|en)(?:&|$)/.test(safePath)
      ? safePath
      : `${safePath}${safePath.includes("?") ? "&" : "?"}locale=en`;
  }
  const localizedPaths = ["/onboarding", "/reset-password"];
  if (localizedPaths.some((path) => safePath === path || safePath.startsWith(path + "?"))) {
    return localePath("en", safePath);
  }
  return localePath("en", "/workspace-language-notice") + "?continue=" + encodeURIComponent(safePath);
}
