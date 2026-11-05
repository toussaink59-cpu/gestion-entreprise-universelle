"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken, isValidInvitationToken } from "@/lib/email/member-invitation";
import { invitationAcceptPath } from "@/lib/email/invitation-link";
import { localeFrom, localePath } from "@/i18n/locale";

function invitationResultPath(result: { success?: string; error?: string }, locale: "fr" | "en") {
  const params = new URLSearchParams();
  if (result.success) params.set("success", result.success);
  if (result.error) params.set("error", result.error);
  params.set("locale", locale);
  return `/invitations/accept?${params.toString()}`;
}

export async function confirmCompanyInvitation(formData: FormData) {
  const locale = localeFrom((await headers()).get("x-polygest-locale"));
  const field = formData.get("token");
  if (typeof field !== "string" || !isValidInvitationToken(field)) {
    redirect(invitationResultPath({ error: "invalid" }, locale));
  }
  const nextPath = invitationAcceptPath(field, locale);
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(nextPath)}`);
  }

  const tokenHash = hashInvitationToken(field);
  const { error } = await supabase.rpc("confirm_company_member_invitation", {
    p_token_hash: tokenHash,
  });
  if (error) {
    console.error("Invitation confirmation failed:", { code: error.code });
    redirect(invitationResultPath({ error: "invalid" }, locale));
  }
  redirect(invitationResultPath({ success: "confirmed" }, locale));
}
