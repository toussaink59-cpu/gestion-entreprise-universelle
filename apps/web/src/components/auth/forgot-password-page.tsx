import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/i18n/locale";
import { localePath } from "@/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AUTH_ERROR_CLASS, AUTH_FIELD_CLASS, AUTH_FIELD_LABEL_CLASS, AUTH_LINK_CLASS, AUTH_STATUS_CLASS } from "@/components/auth/auth-styles";
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
      copy={{ homeLabel: shell("homeLabel"), languageLabel: shell("languageLabel") }}
      title={t("title")}
      description={t("description")}
      footer={
        <p>
          <Link href={localePath(locale, "/login")} className={AUTH_LINK_CLASS}>
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      {query.message === "check-email" ? (
        <p role="status" aria-live="polite" className={`${AUTH_STATUS_CLASS} mb-6`}>
          {t("checkEmail")}
        </p>
      ) : null}

      {error ? (
        <p id="forgot-password-error" role="alert" aria-live="assertive" className={`${AUTH_ERROR_CLASS} mb-6`}>
          {error}
        </p>
      ) : null}

      <form action={requestPasswordReset} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label htmlFor="recovery-email" className={AUTH_FIELD_LABEL_CLASS}>{t("email")}</label>
          <input
            id="recovery-email"
            aria-describedby={error ? "forgot-password-error" : undefined}
            className={AUTH_FIELD_CLASS}
            type="email"
            name="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            placeholder={t("emailPlaceholder")}
          />
        </div>
        <AuthSubmitButton label={t("submit")} pendingLabel={t("pending")} />
      </form>
    </AuthShell>
  );
}
