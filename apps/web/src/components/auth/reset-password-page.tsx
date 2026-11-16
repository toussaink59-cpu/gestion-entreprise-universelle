import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/i18n/locale";
import { localePath, postAuthDestination } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  AUTH_ERROR_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_FIELD_LABEL_CLASS,
  AUTH_HINT_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PRIMARY_ACTION_CLASS,
  AUTH_STATUS_CLASS,
} from "@/components/auth/auth-styles";
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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const hasRecoverySession = Boolean(user && !userError);

  const errors: Record<string, string> = {
    "missing-fields": t("errors.missing-fields"),
    "password-too-short": t("errors.password-too-short"),
    "password-too-long": t("errors.password-too-long"),
    "password-mismatch": t("errors.password-mismatch"),
    "invalid-session": t("errors.invalid-session"),
    "update-failed": t("errors.update-failed"),
  };

  const error = query.error
    ? errors[query.error] ?? t("errors.generic")
    : null;

  const isSuccess = query.success === "updated" && hasRecoverySession;

  return (
    <AuthShell
      locale={locale}
      route="/reset-password"
      copy={{
        homeLabel: shell("homeLabel"),
        languageLabel: shell("languageLabel"),
      }}
      title={t("title")}
      description={t("description")}
      footer={
        hasRecoverySession ? (
          <p>
            <Link
              href={localePath(locale, "/forgot-password")}
              className={AUTH_LINK_CLASS}
            >
              {t("requestNewLink")}
            </Link>
          </p>
        ) : null
      }
    >
      {isSuccess ? (
        <div className="space-y-5">
          <p
            role="status"
            aria-live="polite"
            className={AUTH_STATUS_CLASS}
          >
            {t("success")} {t("successDescription")}
          </p>

          <Link
            href={postAuthDestination(locale, "/dashboard")}
            className={AUTH_PRIMARY_ACTION_CLASS}
          >
            {t("continue")}
          </Link>
        </div>
      ) : !hasRecoverySession ? (
        <div className="space-y-5">
          <p
            role="alert"
            aria-live="assertive"
            className={AUTH_ERROR_CLASS}
          >
            {error ?? t("invalidSession")}
          </p>

          <Link
            href={localePath(locale, "/forgot-password")}
            className={AUTH_PRIMARY_ACTION_CLASS}
          >
            {t("requestNewLink")}
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <p
              id="reset-password-error"
              role="alert"
              aria-live="assertive"
              className={`${AUTH_ERROR_CLASS} mb-6`}
            >
              {error}
            </p>
          ) : null}

          <form action={updatePassword} className="space-y-5">
            <input type="hidden" name="locale" value={locale} />

            <div>
              <label
                htmlFor="new-password"
                className={AUTH_FIELD_LABEL_CLASS}
              >
                {t("password")}
              </label>

              <input
                id="new-password"
                aria-describedby={
                  error
                    ? "reset-password-error new-password-hint"
                    : "new-password-hint"
                }
                className={AUTH_FIELD_CLASS}
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                placeholder={t("passwordPlaceholder")}
              />

              <p id="new-password-hint" className={AUTH_HINT_CLASS}>
                {t("passwordHint")}
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className={AUTH_FIELD_LABEL_CLASS}
              >
                {t("confirmPassword")}
              </label>

              <input
                id="confirm-new-password"
                aria-describedby={
                  error ? "reset-password-error" : undefined
                }
                className={AUTH_FIELD_CLASS}
                type="password"
                name="confirm_password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                placeholder={t("confirmPasswordPlaceholder")}
              />
            </div>

            <AuthSubmitButton
              label={t("submit")}
              pendingLabel={t("pending")}
            />
          </form>
        </>
      )}
    </AuthShell>
  );
}
