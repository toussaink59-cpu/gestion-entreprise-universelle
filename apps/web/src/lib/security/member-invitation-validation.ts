import { isValidEmail, normalizeEmail, readStringField } from "./form-validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MEMBER_INVITATION_ROLES = [
  "employee",
  "finance",
  "sales_purchasing",
  "auditor",
  "company_admin",
  "owner",
] as const;

export type MemberInvitationRole = (typeof MEMBER_INVITATION_ROLES)[number];

type ParseInvitationResult =
  | { ok: true; companyId: string; email: string; roleCode: MemberInvitationRole }
  | { ok: false; reason: "context" | "email" | "role" };

export function parseMemberInvitationForm(formData: FormData): ParseInvitationResult {
  const companyId = readStringField(formData, "company_id");
  const emailField = readStringField(formData, "email");
  const roleField = readStringField(formData, "role_code");

  if (companyId === null || !UUID_PATTERN.test(companyId)) {
    return { ok: false, reason: "context" };
  }

  if (emailField === null) return { ok: false, reason: "email" };
  const email = normalizeEmail(emailField);
  if (!isValidEmail(email)) return { ok: false, reason: "email" };

  if (
    roleField === null ||
    !MEMBER_INVITATION_ROLES.includes(roleField as MemberInvitationRole)
  ) {
    return { ok: false, reason: "role" };
  }

  return {
    ok: true,
    companyId,
    email,
    roleCode: roleField as MemberInvitationRole,
  };
}

/** Préfiltre UX côté serveur. Les fonctions SQL restent l'autorité finale. */
export function canAssignMemberRole(
  actorRole: string,
  targetRole: MemberInvitationRole,
): boolean {
  if (actorRole !== "owner" && actorRole !== "company_admin") return false;
  if (targetRole === "owner" || targetRole === "company_admin") {
    return actorRole === "owner";
  }
  return true;
}

export function canActivateMember(actorRole: string): boolean {
  return actorRole === "owner";
}

export function invitationRolesForActor(actorRole: string): MemberInvitationRole[] {
  if (actorRole === "owner") return [...MEMBER_INVITATION_ROLES];
  if (actorRole === "company_admin") {
    return ["employee", "finance", "sales_purchasing", "auditor"];
  }
  return [];
}