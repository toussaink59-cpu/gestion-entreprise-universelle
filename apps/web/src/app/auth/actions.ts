"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {getSafeRedirectPath} from "@/lib/security/safe-redirect";
import {localeFrom,localePath,postAuthDestination} from "@/i18n/locale";
import {buildPasswordRecoveryCallbackUrl} from "@/lib/auth/password-recovery";
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
if(error){console.error("Supabase sign-in failed:",{code:error.code,status:error.status});if(error.code==="email_not_confirmed")loginFailure("email-not-confirmed",next,locale);loginFailure("invalid-credentials",next,locale);}
redirect(postAuthDestination(locale,next));
}
export async function signUp(formData:FormData){
const locale=formLocale(formData);const nameField=readStringField(formData,"full_name");const emailField=readStringField(formData,"email");const password=readStringField(formData,"password");
if(nameField===null||emailField===null||password===null||!nameField.trim()||!emailField.trim()||!password)registerFailure("missing-fields",locale);
const fullName=nameField.trim();const email=normalizeEmail(emailField);
if(!isValidFullName(fullName))registerFailure("invalid-name",locale);if(!isValidEmail(email))registerFailure("invalid-email",locale);if(password.length<8)registerFailure("password-too-short",locale);if(!isValidNewPassword(password))registerFailure("password-too-long",locale);
const supabase=await createClient();const appUrl=new URL(process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000").origin;const callback=new URL("/auth/callback",appUrl);callback.searchParams.set("next","/onboarding");callback.searchParams.set("locale",locale);
const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName},emailRedirectTo:callback.toString()}});
if(error){console.error("Supabase sign-up failed:",{code:error.code,status:error.status});registerFailure("signup-failed",locale);}
if(data.session)redirect(localePath(locale,"/onboarding"));
redirect(localePath(locale,"/login")+"?message=check-email");
}
export async function signOut(){const supabase=await createClient();await supabase.auth.signOut();redirect("/login");}


export async function requestPasswordReset(formData: FormData) {
  const locale = formLocale(formData);
  const emailField = readStringField(formData, "email");

  if (emailField === null || !emailField.trim()) {
    redirect(localePath(locale, "/forgot-password") + "?error=missing-email");
  }

  const email = normalizeEmail(emailField);
  if (!isValidEmail(email)) {
    redirect(localePath(locale, "/forgot-password") + "?error=invalid-email");
  }

  const supabase = await createClient();
  const redirectTo = buildPasswordRecoveryCallbackUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    locale,
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    console.error("Supabase password recovery request failed:", {
      code: error.code,
      status: error.status,
    });
  }

  // Same visible response for existing and non-existing accounts.
  redirect(localePath(locale, "/forgot-password") + "?message=check-email");
}

export async function updatePassword(formData: FormData) {
  const locale = formLocale(formData);
  const password = readStringField(formData, "password");
  const confirmation = readStringField(formData, "confirm_password");
  const resetPath = localePath(locale, "/reset-password");

  if (password === null || confirmation === null || !password || !confirmation) {
    redirect(resetPath + "?error=missing-fields");
  }
  if (password.length < 8) redirect(resetPath + "?error=password-too-short");
  if (password.length > 128) redirect(resetPath + "?error=password-too-long");
  if (password !== confirmation) redirect(resetPath + "?error=password-mismatch");

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect(resetPath + "?error=invalid-session");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Supabase password update failed:", {
      code: error.code,
      status: error.status,
    });
    redirect(resetPath + "?error=update-failed");
  }

  redirect(resetPath + "?success=updated");
}
