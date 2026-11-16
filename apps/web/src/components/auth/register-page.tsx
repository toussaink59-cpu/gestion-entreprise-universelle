
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { localePath, type Locale } from "@/i18n/locale";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  AUTH_ERROR_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_FIELD_LABEL_CLASS,
  AUTH_HINT_CLASS,
  AUTH_LINK_CLASS,
} from "@/components/auth/auth-styles";
import { signUp } from "@/app/auth/actions";

export async function RegisterPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ error?: string }>;
}) {
  const [t, shell, query] = await Promise.all([
    getTranslations({ locale, namespace: "Auth.Register" }),
    getTranslations({ locale, namespace: "Auth.Shell" }),
    searchParams,
  ]);

  const errors: Record<string, string> = {
    "missing-fields": t("errors.missing-fields"),
    "invalid-name": t("errors.invalid-name"),
    "invalid-email": t("errors.invalid-email"),
    "password-too-long": t("errors.password-too-long"),
    "password-too-short": t("errors.password-too-short"),
    "signup-failed": t("errors.signup-failed"),
  };

  const error = query.error
    ? errors[query.error] ?? t("errors.generic")
    : null;

  return (
    <AuthShell
      locale={locale}
      route="/register"
      copy={{
        homeLabel: shell("homeLabel"),
        languageLabel: shell("languageLabel"),
      }}
      title={t("title")}
      description={t("description")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link
            href={localePath(locale, "/login")}
            className={AUTH_LINK_CLASS}
          >
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      {error ? (
        <p
          id="register-error"
          role="alert"
          aria-live="assertive"
          className={`${AUTH_ERROR_CLASS} mb-6`}
        >
          {error}
        </p>
      ) : null}

      <form action={signUp} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label
            htmlFor="register-full-name"
            className={AUTH_FIELD_LABEL_CLASS}
          >
            {t("fullName")}
          </label>
          <input
            id="register-full-name"
            aria-describedby={error ? "register-error" : undefined}
            className={AUTH_FIELD_CLASS}
            type="text"
            name="full_name"
            autoComplete="name"
            maxLength={100}
            minLength={2}
            required
            placeholder={t("fullNamePlaceholder")}
          />
        </div>

        <div>
          <label
            htmlFor="register-email"
            className={AUTH_FIELD_LABEL_CLASS}
          >
            {t("email")}
          </label>
          <input
            id="register-email"
            aria-describedby={error ? "register-error" : undefined}
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
          <label
            htmlFor="register-password"
            className={AUTH_FIELD_LABEL_CLASS}
          >
            {t("password")}
          </label>
          <input
            id="register-password"
            aria-describedby={
              error
                ? "register-error register-password-hint"
                : "register-password-hint"
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
          <p id="register-password-hint" className={AUTH_HINT_CLASS}>
            {t("passwordHint")}
          </p>
        </div>

        <AuthSubmitButton
          label={t("submit")}
          pendingLabel={t("pending")}
        />
      </form>
    </AuthShell>
  );
}
