"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canActivateMember,
  canAssignMemberRole,
  parseMemberInvitationForm,
} from "@/lib/security/member-invitation-validation";

function returnTo(companyId: string, result: { error?: string; success?: string }): never {
  const params = new URLSearchParams({ company: companyId });
  if (result.error) params.set("error", result.error);
  if (result.success) params.set("success", result.success);
  redirect(`/dashboard/membres?${params.toString()}`);
}

export async function inviteCompanyMember(formData: FormData) {
  const parsed = parseMemberInvitationForm(formData);
  if (!parsed.ok) {
    if (parsed.reason === "context") redirect("/dashboard");
    return redirect("/dashboard/membres?error=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  // Contrôle du contexte de l'acteur côté serveur. Le RPC et le déclencheur
  // PostgreSQL vérifient de nouveau les permissions avant toute insertion.
  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("role_code")
    .eq("company_id", parsed.companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    returnTo(parsed.companyId, { error: "access" });
  }

  if (!canAssignMemberRole(String(membership.role_code), parsed.roleCode)) {
    returnTo(parsed.companyId, { error: "permission" });
  }

  const { error } = await supabase.rpc("invite_existing_company_member", {
    p_company_id: parsed.companyId,
    p_email: parsed.email,
    p_role_code: parsed.roleCode,
  });

  if (error) {
    console.error("Member invitation failed:", { code: error.code });
    if (error.code === "23505") returnTo(parsed.companyId, { error: "duplicate" });
    if (error.code === "P0002") returnTo(parsed.companyId, { error: "no-account" });
    if (error.code === "22023") returnTo(parsed.companyId, { error: "invalid" });
    if (error.code === "42501") returnTo(parsed.companyId, { error: "permission" });
    returnTo(parsed.companyId, { error: "save" });
  }

  returnTo(parsed.companyId, { success: "invited" });
}

export async function activateCompanyMember(formData: FormData) {
  const companyField = formData.get("company_id");
  const membershipField = formData.get("membership_id");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    typeof companyField !== "string" || !uuidPattern.test(companyField) ||
    typeof membershipField !== "string" || !uuidPattern.test(membershipField)
  ) {
    redirect("/dashboard");
  }

  const companyId = companyField;
  const membershipId = membershipField;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: actorMembership, error: actorError } = await supabase
    .from("company_memberships")
    .select("role_code")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (actorError || !actorMembership) returnTo(companyId, { error: "access" });
  if (!canActivateMember(String(actorMembership.role_code))) {
    returnTo(companyId, { error: "permission" });
  }

  const { data, error } = await supabase
    .from("company_memberships")
    .update({ status: "active" })
    .eq("id", membershipId)
    .eq("company_id", companyId)
    .eq("status", "invited")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Member activation failed:", { code: error.code });
    returnTo(companyId, { error: error.code === "42501" ? "permission" : "save" });
  }
  if (!data) returnTo(companyId, { error: "not-found" });
  returnTo(companyId, { success: "activated" });
}