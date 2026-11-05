import {getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import {PageHeader} from "@/components/ui/page-header";
import {CompanyCreationForm} from "@/components/companies/company-creation-form";
import {LocaleSwitcher} from "@/components/i18n/locale-switcher";
import {createCompany} from "@/app/onboarding/actions";
import {createClient} from "@/lib/supabase/server";
import {decideOnboardingAccess} from "@/lib/security/onboarding-access";
import {postAuthDestination,type Locale} from "@/i18n/locale";
export async function OnboardingPage({locale}:{locale:Locale}){
const t=await getTranslations({locale,namespace:"Onboarding"});const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
if(!user)redirect(locale==="en"?"/en/login":"/login");
const {data:memberships,error}=await supabase.from("company_memberships").select("company_id").eq("user_id",user.id).eq("status","active").limit(1);
const decision=decideOnboardingAccess(Boolean(error),memberships);if(decision==="dashboard")redirect(postAuthDestination(locale,"/dashboard"));
return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8 flex justify-end"><LocaleSwitcher locale={locale} href="/onboarding" label={t("languageLabel")}/></div>
<PageHeader eyebrow={decision==="error"?"PolyGest · Configuration":t("eyebrow")} title={decision==="error"?t("errorTitle"):t("title")} description={decision==="error"?t("securityError"):t("description")}/>
{decision==="error"?<><p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]">{t("verificationFailed")}</p><p className="mt-5 text-sm"><a href={locale==="en"?"/en/onboarding":"/onboarding"} className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline">{t("retry")}</a></p></>:<CompanyCreationForm action={createCompany} submitLabel={t("submit")} locale={locale} labels={{legalName:t("legalName"),legalPlaceholder:t("legalPlaceholder"),tradeName:t("tradeName"),optional:t("optional"),tradePlaceholder:t("tradePlaceholder")}}/>}
</main>;
}
