import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/i18n/locale";
import { localePath } from "@/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { requestPasswordReset } from "@/app/auth/actions";

export async function ForgotPasswordPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [t, shell, query] = await Promise.all([
    getTranslations({ locale, namespace: "Auth.ForgotPassword" }),
    getTranslations({ locale, namespace: "Auth.Shell" }),
    searchParams,
  ]);
  const errors: Record<string, string> = {
    "missing-email": t("errors.missing-email"),
    "invalid-email": t("errors.invalid-email"),
  };
  const error = query.error ? errors[query.error] ?? t("errors.generic") : null;

  return (
    <AuthShell
      locale={locale}
      route="/forgot-password"
      copy={{
        homeLabel: shell("homeLabel"),
        eyebrow: shell("eyebrow"),
        headline: shell("headline"),
        description: shell("description"),
        footer: shell("footer"),
        languageLabel: shell("languageLabel"),
      }}
      title={t("title")}
      description={t("description")}
      footer={
        <p>
          {t("loginPrompt")}{" "}
          <Link href={localePath(locale, "/login")} className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline">
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      {query.message === "check-email" ? (
        <p role="status" aria-live="polite" className="mb-6 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm leading-6 text-[var(--pg-text)]">
          {t("checkEmail")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" aria-live="assertive" className="mb-6 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]">
          {error}
        </p>
      ) : null}
      <form action={requestPasswordReset} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label htmlFor="recovery-email" className="block text-sm font-semibold text-[var(--pg-text)]">{t("email")}</label>
          <input
            id="recovery-email"
            className="mt-2 block min-h-12 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-text-muted)] focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            type="email" name="email" autoComplete="email" autoCapitalize="none"
            spellCheck={false} maxLength={254} required placeholder={t("emailPlaceholder")}
          />
        </div>
        <AuthSubmitButton label={t("submit")} pendingLabel={t("pending")} />
      </form>
    </AuthShell>
  );
}
