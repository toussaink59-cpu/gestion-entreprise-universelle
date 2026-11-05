import {getTranslations} from "next-intl/server";
import Link from "next/link";
import type {Locale} from "@/i18n/locale";
import {AuthShell} from "@/components/auth/auth-shell";
import {AuthSubmitButton} from "@/components/auth/auth-submit-button";
import {signIn} from "@/app/auth/actions";
import {getSafeRedirectPath} from "@/lib/security/safe-redirect";
import {localePath} from "@/i18n/locale";
export async function LoginPage({locale,searchParams}:{locale:Locale;searchParams:Promise<{error?:string;message?:string;next?:string}>}){
const [t,shell,query]=await Promise.all([getTranslations({locale,namespace:"Auth.Login"}),getTranslations({locale,namespace:"Auth.Shell"}),searchParams]);
const errors:Record<string,string>={"missing-fields":t("errors.missing-fields"),"invalid-email":t("errors.invalid-email"),"password-too-long":t("errors.password-too-long"),"email-not-confirmed":t("errors.email-not-confirmed"),"invalid-credentials":t("errors.invalid-credentials"),"confirmation-failed":t("errors.confirmation-failed")};
const error=query.error?errors[query.error]??t("errors.generic"):null;
const nextPath=getSafeRedirectPath(query.next??null);
return <AuthShell locale={locale} route="/login" copy={{homeLabel:shell("homeLabel"),eyebrow:shell("eyebrow"),headline:shell("headline"),description:shell("description"),footer:shell("footer"),languageLabel:shell("languageLabel")}} title={t("title")} description={t("description")} footer={<p>{t("noAccount")}{" "}<Link href={localePath(locale,¶»§q«^