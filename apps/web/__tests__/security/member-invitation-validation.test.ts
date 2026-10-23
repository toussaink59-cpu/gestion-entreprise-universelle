import { describe, expect, it } from "vitest";
import {
  canActivateMember,
  canAssignMemberRole,
  invitationRolesForActor,
  parseMemberInvitationForm,
} from "../../src/lib/security/member-invitation-validation";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function makeForm(overrides: Record<string, string> = {}) {
  const values = {
    company_id: COMPANY_ID,
    email: " Member@Example.test ",
    role_code: "employee",
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("parseMemberInvitationForm", () => {
  it("valide le contexte et normalise l’adresse e-mail", () => {
    expect(parseMemberInvitationForm(makeForm())).toEqual({
      ok: true,
      companyId: COMPANY_ID,
      email: "member@example.test",
      roleCode: "employee",
    });
  });

  it("refuse un identifiant d’entreprise invalide", () => {
    expect(parseMemberInvitationForm(makeForm({ company_id: "invalide" }))).toEqual({
      ok: false,
      reason: "context",
    });
  });

  it("refuse une adresse e-mail invalide", () => {
    expect(parseMemberInvitationForm(makeForm({ email: "pas-une-adresse" }))).toEqual({
      ok: false,
      reason: "email",
    });
  });

  it("refuse un rôle absent du catalogue autorisé", () => {
    expect(parseMemberInvitationForm(makeForm({ role_code: "super_admin" }))).toEqual({
      ok: false,
      reason: "role",
    });
  });
});

describe("canAssignMemberRole", () => {
  it("permet au propriétaire d’attribuer les rôles privilégiés", () => {
    expect(canAssignMemberRole("owner", "owner")).toBe(true);
    expect(canAssignMemberRole("owner", "company_admin")).toBe(true);
  });

  it("empêche un administrateur d’attribuer owner ou company_admin", () => {
    expect(canAssignMemberRole("company_admin", "owner")).toBe(false);
    expect(canAssignMemberRole("company_admin", "company_admin")).toBe(false);
    expect(canAssignMemberRole("company_admin", "employee")).toBe(true);
  });

  it("refuse la gestion des rôles aux autres profils", () => {
    expect(canAssignMemberRole("employee", "employee")).toBe(false);
    expect(invitationRolesForActor("employee")).toEqual([]);
  });

  it("réserve l’activation des invitations au propriétaire", () => {
    expect(canActivateMember("owner")).toBe(true);
    expect(canActivateMember("company_admin")).toBe(false);
    expect(canActivateMember("employee")).toBe(false);
  });

  it("présente seulement les rôles autorisés dans le formulaire administrateur", () => {
    expect(invitationRolesForActor("company_admin")).toEqual([
      "employee",
      "finance",
      "sales_purchasing",
      "auditor",
    ]);
  });
});