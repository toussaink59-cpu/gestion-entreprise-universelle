import type { Locale } from "@/i18n/locale";
import { setLocalePreference } from "@/app/auth/locale-actions";

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
      <form action={setLocalePreference}>
        <input type="hidden" name="locale" value="fr" />
        <input type="hidden" name="route" value={href} />
        <button
          type="submit"
          aria-pressed={locale === "fr"}
          className={`inline-flex min-h-11 items-center rounded-sm px-1 ${locale === "fr"
          ? "font-semibold text-[var(--pg-text)]"
          : "text-[var(--pg-text-muted)] underline-offset-4 hover:text-[var(--pg-text)] hover:underline"}`}
        >
          Français
        </button>
      </form>
      <span aria-hidden="true" className="text-[var(--pg-border)]">|</span>
      <form action={setLocalePreference}>
        <input type="hidden" name="locale" value="en" />
        <input type="hidden" name="route" value={href} />
        <button
          type="submit"
          aria-pressed={locale === "en"}
          className={`inline-flex min-h-11 items-center rounded-sm px-1 ${locale === "en"
          ? "font-semibold text-[var(--pg-text)]"
          : "text-[var(--pg-text-muted)] underline-offset-4 hover:text-[var(--pg-text)] hover:underline"}`}
        >
          English
        </button>
      </form>
    </nav>
  );
}
