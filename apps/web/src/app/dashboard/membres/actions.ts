"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localeFrom } from "@/i18n/locale";
import {
  createInvitationToken,
  isMemberInvitationEmailConfigured,
  sendMemberInvitationEmail,
} from "@/lib/email/member-invitation";
import {
  INVITATION_LINK_COOKIE,
  INVITATION_LINK_COOKIE_MAX_AGE_SECONDS,
  INVITATION_LINK_COOKIE_PATH,
  invitationAcceptPath,
  parseInvitationLinkCookie,
  resolveAppOrigin,
} from "@/lib/email/invitation-link";
import {
  canActivateMember,
  canAssignMemberRole,
  parseMemberInvitationForm,
} from "@/lib/security/member-invitation-validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function returnTo(companyId: string, result: { error?: string; success?: string }): never {
  const params = new URLSearchParams({ company: companyId });
  if (result.error) params.set("error", result.error);
  if (result.success) params.set("success", result.success);
  redirect(`/dashboard/membres?${params.toString()}`);
}

function mapRpcError(code: string, companyId: string): never {
  console.error("Member invitation RPC failed:", { code });
  if (code === "23505") returnTo(companyId, { error: "duplicate" });
  if (code === "P0002") returnTo(companyId, { error: "no-account" });
  if (code === "22023") returnTo(companyId, { error: "invalid" });
  if (code === "42501") returnTo(companyId, { error: "permission" });
  if (code === "P0001") returnTo(companyId, { error: "email-rate-limit" });
  returnTo(companyId, { error: "save" });
}

/**
 * Quand l'e-mail ne part pas (Resend non configuré, échec, limite), le lien est montré une seule
 * fois à l'invitant, via un cookie court, httpOnly, limité à la page des membres.
 */
async function keepInvitationLinkForInviter(token: string, userId: string) {
  const store = await cookies();
  store.set(INVITATION_LINK_COOKIE, `${userId}|${invitationAcceptPath(token)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: INVITATION_LINK_COOKIE_PATH,
    maxAge: INVITATION_LINK_COOKIE_MAX_AGE_SECONDS,
  });
}

async function markEmailSent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  membershipId: string,
  tokenHash: string,
  emailId: string,
) {
  const { error } = await supabase.rpc("mark_company_member_invitation_email_sent", {
    p_membership_id: membershipId,
    p_token_hash: tokenHash,
    p_provider_message_id: emailId,
  });
  if (error) console.error("Could not mark invitation email as sent:", { code: error.code });
}

export async function inviteCompanyMember(formData: FormData) {
  const parsed = parseMemberInvitationForm(formData);
  if (!parsed.ok) {
    if (parsed.reason === "context") redirect("/dashboard");
    return redirect("/dashboard/membres?error=invalid");
  }
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("role_code")
    .eq("company_id", parsed.companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError || !membership) returnTo(parsed.companyId, { error: "access" });
  if (!canAssignMemberRole(String(membership.role_code), parsed.roleCode)) {
    returnTo(parsed.companyId, { error: "permission" });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("legal_name, trade_name")
    .eq("id", parsed.companyId)
    .maybeSingle();
  if (companyError || !company) returnTo(parsed.companyId, { error: "access" });

  const { token, tokenHash } = createInvitationToken();
  const emailLocale = localeFrom((await headers()).get("x-polygest-locale"));
  const { data: membershipId, error } = await supabase.rpc("create_company_member_invitation", {
    p_company_id: parsed.companyId,
    p_email: parsed.email,
    p_role_code: parsed.roleCode,
    p_token_hash: tokenHash,
  });
  if (error) mapRpcError(error.code, parsed.companyId);
  if (typeof membershipId !== "string" || !UUID_PATTERN.test(membershipId)) {
    returnTo(parsed.companyId, { error: "save" });
  }

  const sent = isMemberInvitationEmailConfigured()
    ? await sendMemberInvitationEmail({
        to: parsed.email,
        companyName: company.trade_name || company.legal_name,
        roleCode: parsed.roleCode,
        inviterName: String(user.user_metadata?.full_name || user.email || "PolyGest"),
        locale: emailLocale,
        token,
        idempotencyKey: `member-invitation/${membershipId}/${tokenHash.slice(0, 16)}`,
      })
    : null;
  if (!sent || !sent.ok) {
    console.error("Member invitation email not delivered:", { reason: sent ? sent.reason : "not-configured" });
    await keepInvitationLinkForInviter(token, user.id);
    returnTo(parsed.companyId, { success: "invited-link" });
  }
  await markEmailSent(supabase, membershipId, tokenHash, sent.emailId);
  returnTo(parsed.companyId, { success: "invited" });
}

export async function resendCompanyMemberInvitation(formData: FormData) {
  const companyField = formData.get("company_id");
  const membershipField = formData.get("membership_id");
  if (typeof companyField !== "string" || !UUID_PATTERN.test(companyField) ||
      typeof membershipField !== "string" || !UUID_PATTERN.test(membershipField)) {
    redirect("/dashboard");
  }
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");
  const { data: actorMembership, error: actorError } = await supabase
    .from("company_memberships")
    .select("role_code")
    .eq("company_id", companyField)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (actorError || !actorMembership) returnTo(companyField, { error: "access" });
  if (!canActivateMember(String(actorMembership.role_code)) && String(actorMembership.role_code) !== "company_admin") {
    returnTo(companyField, { error: "permission" });
  }

  const { token, tokenHash } = createInvitationToken();
  const emailLocale = localeFrom((await headers()).get("x-polygest-locale"));
  const { data, error } = await supabase.rpc("prepare_company_member_invitation_resend", {
    p_company_id: companyField,
    p_membership_id: membershipField,
    p_token_hash: tokenHash,
  });
  if (error) mapRpcError(error.code, companyField);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.invite_email !== "string" || typeof row.role_code !== "string" || typeof row.company_name !== "string") {
    returnTo(companyField, { error: "save" });
  }

  const sent = isMemberInvitationEmailConfigured()
    ? await sendMemberInvitationEmail({
        to: row.invite_email,
        companyName: row.company_name,
        roleCode: row.role_code,
        inviterName: String(user.user_metadata?.full_name || user.email || "PolyGest"),
        locale: emailLocale,
        token,
        idempotencyKey: `member-invitation/${membershipField}/${tokenHash.slice(0, 16)}`,
      })
    : null;
  if (!sent || !sent.ok) {
    console.error("Member invitation resend not delivered:", { reason: sent ? sent.reason : "not-configured" });
    await keepInvitationLinkForInviter(token, user.id);
    returnTo(companyField, { success: "invited-link" });
  }
  await markEmailSent(supabase, membershipField, tokenHash, sent.emailId);
  returnTo(companyField, { success: "resent" });
}

/** Consomme le lien manuel : il est réservé à l'invitant connecté et supprimé dès lecture. */
export async function consumeInvitationLink(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const store = await cookies();
  const raw = store.get(INVITATION_LINK_COOKIE)?.value;
  store.delete(INVITATION_LINK_COOKIE);
  if (error || !user) return null;
  const path = parseInvitationLinkCookie(raw, user.id);
  if (!path) return null;
  const requestHeaders = await headers();
  const origin = resolveAppOrigin({
    configuredUrl: process.env.NEXT_PUBLIC_APP_URL,
    host: requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
  });
  return origin ? `${origin}${path}` : path;
}

export async function activateCompanyMember(formData: FormData) {
  const companyField = formData.get("company_id");
  const membershipField = formData.get("membership_id");
  if (typeof companyField !== "string" || !UUID_PATTERN.test(companyField) ||
      typeof membershipField !== "string" || !UUID_PATTERN.test(membershipField)) {
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
  if (!canActivateMember(String(actorMembership.role_code))) returnTo(companyId, { error: "permission" });

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
    returnTo(companyId, { error: error.code === "42501" ? "permission" : error.code === "P0001" ? "email-not-confirmed" : "save" });
  }
  if (!data) returnTo(companyId, { error: "not-found" });
  returnTo(companyId, { success: "activated" });
}
