import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/i18n/locale";
import { localePath, postAuthDestination } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { updatePassword } from "@/app/auth/actions";

export async function ResetPasswordPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [t, shell, query] = await Promise.all([
    getTranslations({ locale, namespace: "Auth.ResetPassword" }),
    getTranslations({ locale, namespace: "Auth.Shell" }),
    searchParams,
  ]);
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const hasRecoverySession = Boolean(user && !userError);

  const errors: Record<string, string> = {
    "missing-fields": t("errors.missing-fields"),
    "password-too-short": t("errors.password-too-short"),
    "password-too-long": t("errors.password-too-long"),
    "password-mismatch": t("errors.password-mismatch"),
    "invalid-session": t("errors.invalid-session"),
    "update-failed": t("errors.update-failed"),
  };
  const error = query.error ? errors[query.error] ?? t("errors.generic") : null;
  const isSuccess = query.success === "updated" && hasRecoverySession;

  return (
    <AuthShell
      locale={locale}
      route="/reset-password"
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
          <Link href={localePath(locale, "/forgot-password")} className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline">
            {t("requestNewLink")}
          </Link>
        </p>
      }
    >
      {isSuccess ? (
        <div className="space-y-5">
          <p role="status" aria-live="polite" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm leading-6 text-[var(--pg-text)]">
            {t("success")} {t("successDescription")}
          </p>
          <Link href={postAuthDestination(locale, "/dashboard")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-base font-semibold text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">
            {t("continue")}
          </Link>
        </div>
      ) : !hasRecoverySession ? (
        <div className="space-y-5">
          <p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]">
            {error ?? t("invalidSession")}
          </p>
          <Link href={localePath(locale, "/forgot-password")} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-base font-semibold text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">
            {t("requestNewLink")}
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <p role="alert" aria-live="assertive" className="mb-6 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]">
              {error}
            </p>
          ) : null}
          <form action={updatePassword} className="space-y-5">
            <input type="hidden" name="locale" value={locale} />
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-[var(--pg-text)]">{t("password")}</label>
              <input
                id="new-password"
                className="mt-2 block min-h-12 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-text-muted)] focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
                type="password" name="password" autoComplete="new-password" minLength={8}
                maxLength={128} required aria-describedby="new-password-hint" placeholder={t("passwordPlaceholder")}
              />
              <p id="new-password-hint" className="mt-2 text-sm leading-5 text-[var(--pg-text-muted)]">{t("passwordHint")}</p>
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-[var(--pg-text)]">{t("confirmPassword")}</label>
              <input
                id="confirm-new-password"
                className="mt-2 block min-h-12 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-text-muted)] focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
                type="password" name="confirm_password" autoComplete="new-password" minLength={8}
                maxLength={128} required placeholder={t("confirmPasswordPlaceholder")}
              />
            </div>
            <AuthSubmitButton label={t("submit")} pendingLabel={t("pending")} />
          </form>
        </>
      )}
    </AuthShell>
  );
}
