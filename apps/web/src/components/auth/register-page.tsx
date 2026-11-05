import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {localePath, type Locale} from "@/i18n/locale";
import {AuthShell} from "@/components/auth/auth-shell";
import {AuthSubmitButton} from "@/components/auth/auth-submit-button";
import {signUp} from "@/app/auth/actions";
export async function RegisterPage({locale,searchParams}:{locale:Locale;searchParams:Promise<{error?:string}>}){
const [t,shell,query]=await Promise.all([getTranslations({locale,namespace:"Auth.Register"}),getTranslations({locale,namespace:"Auth.Shell"}),searchParams]);
const errors:Record<string,string>={"missing-fields":t("errors.missing-fields"),"invalid-name":t("errors.invalid-name"),"invalid-email":t("errors.invalid-email"),"password-too-long":t("errors.password-too-long"),"password-too-short":t("errors.password-too-short"),"signup-failed":t("errors.signup-failed")};
const error=query.error?errors[query.error]??t("errors.generic"):null;
return <AuthShell locale={locale} route="/register" copy={{homeLabel:shell("homeLabel"),eyebrow:shell("eyebrow"),headline:shell("headline"),description:shell("description"),footer:shell("footer"),languageLabel:shell("languageLabel")}} title={t("title")} description={t("description")} footer={<p>{t("haveAccount")}{" "}<Link href={localePath(locale, "/login")} className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline">{t("loginLink")}</Link></p>}>
{error?<p role="alert" aria-live="assertive" className="mb-6 rounded-¶»§q«^