"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSafeRedirectPath} from "@/lib/security/safe-redirect";
import {localeFrom,localePath,postAuthDestination} from "@/i18n/locale";
import {isValidEmail,isValidFullName,isValidNewPassword,normalizeEmail,readStringField} from "@/lib/security/form-validation";
function formLocale(f:FormData){return localeFrom(readStringField(f,"locale"));}
function loginFailure(code:string,next:string,locale:"fr"|"en"):never{const q=new URLSearchParams({error:code});if(next!=="/dashboard")q.set("next",next);redirect(localePath(locale,"/login")+"?"+q.toString());}
function registerFailure(code:string,locale:"fr"|"en"):never{redirect(localePath(locale,"/register")+"?error="+encodeURIComponent(code));}
export async function signIn(formData:FormData){
const locale=formLocale(formData);const next=getSafeRedirectPath(readStringField(formData,"next"),"/dashboard");
const emailField=readStringField(formData,"email");const password=readStringField(formData,"password");
if(emailField===null||password===null||!emailField.trim()||!password)loginFailure("missing-fields",next,locale);
const email=normalizeEmail(emailField);if(!isValidEmail(email))loginFailure("invalid-email",next,locale);if(password.length>128)loginFailure("password-too-long",next,locale);
const supabase=await createClient();const {error}=await supabase.auth.signInWithPassword({email,password});
if(error){console.error("Supabase¶»§q«^