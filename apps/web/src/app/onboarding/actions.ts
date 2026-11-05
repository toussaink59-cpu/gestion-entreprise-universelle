"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {isValidCompanyName,readStringField} from "@/lib/security/form-validation";
import {localeFrom,localePath,postAuthDestination,type Locale} from "@/i18n/locale";
type ReturnPath="/onboarding"|"/dashboard/entreprises/nouvelle";
function validLength(s:string){const n=Array.from(s).length;return n>=2&&n<=200;}
async function create(formData:FormData,path:ReturnPath){
const locale:Locale=localeFrom(readStringField(formData,"locale"));const dest=path==="/onboarding"?localePath(locale,path):path;
const legal=(readStringField(formData,"legal_name")??"").trim();if(!legal)redirect(dest+"?error=missing-name");
const tradeField=readStringField(formData,"trade_name");if(tradeField===null&&formData.has("trade_name"))redirect(dest+"?error=invalid-trade-name");
const trade=(tradeField??"").trim();
if(!validLength(legal)||!isValidCompanyName(legal))redirect(dest+"?error=invalid-name");
if(trade&&(!validLength(trade)||!isValidCompanyName(trade)))redirect(dest+"?error=invalid-trade-name");
const supabase=await createClient();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)redirect(localePath(locale,"/login"));
const {error}=await supabase.rpc("create_company",{p_legal_name:legal,p_trade_name:trade||null,p_country_code:"BF",p_currency:"XOF",p_timezone:"Africa/Ouagadougou"});
if(error){console.error("create_company failed:",error.code);if(error.code==="22023")redirect(dest+"?error=invalid-company-data");redirect(dest+"?error=creation-failed");}
redirect(path==="/onboarding"?postAuthDestination(locale,"/dashboard"):"/dashboard");
}
export async function createCompany(formData:FormData){await create(formData,"/onboarding");}
export async function createAdditionalCompany(formData:FormData){await create(formData,"/dashboard/entreprises/nouvelle");}
