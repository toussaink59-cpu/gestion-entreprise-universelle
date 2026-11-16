import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/i18n/locale";
import { localePath } from "@/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  AUTH_ERROR_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_FIELD_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_STATUS_CLASS,
} from "@/components/auth/auth-styles";
import { signIn } from "@/app/auth/actions";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";

export async function LoginPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
}) {
  const [t, shell, query] = await Promise.all([
    getTranslations({ locale, namespace: "Auth.Login" }),
    getTranslations({ locale, namespace: "Auth.Shell" }),
    searchParams,
  ]);

  const errors: Record<string, string> = {
    "missing-fields": t("errors.missing-fields"),
    "invalid-email": t("errors.invalid-email"),
    "password-too-long": t("errors.password-too-long"),
    "email-not-confirmed": t("errors.email-not-confirmed"),
    "invalid-credentials": t("errors.invalid-credentials"),
    "confirmation-failed": t("errors.confirmation-failed"),
  };

  const error = query.error
    ? errors[query.error] ?? t("errors.generic")
    : null;

  const nextPath = getSafeRedirectPath(query.next ?? null);

  return (
    <AuthShell
      locale={locale}
      route="/login"
      copy={{
        homeLabel: shell("homeLabel"),
        languageLabel: shell("languageLabel"),
      }}
      title={t("title")}
      description={t("description")}
      footer={
        <p>
          {t("noAccount")}{" "}
          <Link
            href={localePath(locale, "/register")}
            className={AUTH_LINK_CLASS}
          >
            {t("registerLink")}
          </Link>
        </p>
      }
    >
      {query.message === "check-email" ? (
        <p
          role="status"
          aria-live="polite"
          className={`${AUTH_STATUS_CLASS} mb-6`}
        >
          {t("checkEmail")}
        </p>
      ) : null}

      {error ? (
        <p
          id="login-error"
          role="alert"
          aria-live="assertive"
          className={`${AUTH_ERROR_CLASS} mb-6`}
        >
          {error}
        </p>
      ) : null}

      <form action={signIn} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label
            htmlFor="login-email"
            className={AUTH_FIELD_LABEL_CLASS}
          >
            {t("email")}
          </label>

          <input
            id="login-email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
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

        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="login-password"
              className={AUTH_FIELD_LABEL_CLASS}
            >
              {t("password")}
            </label>

            <Link
              href={localePath(locale, "/forgot-password")}
              className={`text-sm ${AUTH_LINK_CLASS}`}
            >
              {t("forgotPasswordLink")}
            </Link>
          </div>

          <input
            id="login-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className={AUTH_FIELD_CLASS}
            type="password"
            name="password"
            autoComplete="current-password"
            maxLength={128}
            required
            placeholder={t("passwordPlaceholder")}
          />
        </div>

        <AuthSubmitButton
          label={t("submit")}
          pendingLabel={t("pending")}
        />
      </form>
    </AuthShell>
  );
}