import Link from "next/link";
import type { Locale } from "@/i18n/locale";

function hrefForLocale(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : "/" + path;
  if (locale === "fr") return normalized;
  return normalized === "/" ? "/en" : "/en" + normalized;
}

export function LocaleSwitcher({
  locale,
  href,
  label,
}: {
  locale: Locale;
  href: "/login" | "/register" | "/forgot-password" | "/reset-password" | "/onboarding" | "/workspace-language-notice";
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex items-center gap-2 text-sm">
      <Link
        href={hrefForLocale("fr", href)}
        aria-current={locale === "fr" ? "page" : undefined}
        className={locale === "fr"
          ? "font-semibold text-[var(--pg-text)]"
          : "text-[var(--pg-text-muted)] underline-offset-4 hover:text-[var(--pg-text)] hover:underline"}
      >
        Français
      </Link>
      <span aria-hidden="true" className="text-[var(--pg-border)]">|</span>
      <Link
        href={hrefForLocale("en", href)}
        aria-current={locale === "en" ? "page" : undefined}
        className={locale === "en"
          ? "font-semibold text-[var(--pg-text)]"
          : "text-[var(--pg-text-muted)] underline-offset-4 hover:text-[var(--pg-text)] hover:underline"}
      >
        English
      </Link>
    </nav>
  );
}
