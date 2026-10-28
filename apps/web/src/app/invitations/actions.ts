"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken, isValidInvitationToken } from "@/lib/email/member-invitation";

export async function confirmCompanyInvitation(formData: FormData) {
  const field = formData.get("token");
  if (typeof field !== "string" || !isValidInvitationToken(field)) {
    redirect("/invitations/accept?error=invalid");
  }
  const nextPath = `/invitations/accept?token=${encodeURIComponent(field)}`;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const tokenHash = hashInvitationToken(field);
  const { error } = await supabase.rpc("confirm_company_member_invitation", {
    p_token_hash: tokenHash,
  });
  if (error) {
    console.error("Invitation confirmation failed:", { code: error.code });
    redirect("/invitations/accept?error=invalid");
  }
  redirect("/invitations/accept?success=confirmed");
}
