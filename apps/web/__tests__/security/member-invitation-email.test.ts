import { describe, expect, it } from "vitest";
import {
  buildInvitationEmail,
  createInvitationToken,
  escapeHtml,
  hashInvitationToken,
  isValidInvitationToken,
  roleLabelForEmail,
} from "../../src/lib/email/member-invitation";
import { getSafeRedirectPath } from "../../src/lib/security/safe-redirect";

describe("jetons d’invitation e-mail", () => {
  it("génère un jeton aléatoire au format base64url de 32 octets", () => {
    const result = createInvitationToken();
    expect(isValidInvitationToken(result.token)).toBe(true);
    expect(result.token).toHaveLength(43);
    expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenHash).not.toBe(result.token);
  });

  it("produit un hash stable pour le même jeton", () => {
    const { token } = createInvitationToken();
    expect(hashInvitationToken(token)).toBe(hashInvitationToken(token));
  });

  it("rejette les jetons mal formés", () => {
    for (const token of ["", "abc", "A".repeat(42), "A".repeat(42) + "!"]) {
      expect(isValidInvitationToken(token)).toBe(false);
      expect(() => hashInvitationToken(token)).toThrow();
    }
  });

  it("échappe tous les caractères HTML contrôlables", () => {
    expect(escapeHtml(`<script a="b">'&</script>`)).toBe("&lt;script a=&quot;b&quot;&gt;&#39;&amp;&lt;/script&gt;");
  });

  it("utilise les libellés connus sans exposer le code interne", () => {
    expect(roleLabelForEmail("sales_purchasing")).toBe("Commercial / achats");
    expect(roleLabelForEmail("unlisted_role")).toBe("Membre");
  });

  it("échappe les données dynamiques dans le modèle d’e-mail", () => {
    const email = buildInvitationEmail({
      companyName: `<Entreprise & Co>`,
      roleLabel: `Employé <script>`,
      inviterName: `Alice "Admin"`,
      acceptUrl: "https://example.test/invitations/accept?token=Abc",
    });
    expect(email.html).toContain("&lt;Entreprise &amp; Co&gt;");
    expect(email.html).toContain("Employé &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("https://example.test/invitations/accept?token=Abc");
  });

  it("ne permet au redirect de retour que des chemins internes", () => {
    const token = createInvitationToken().token;
    const path = `/invitations/accept?token=${encodeURIComponent(token)}`;
    expect(getSafeRedirectPath(path)).toBe(path);
    expect(getSafeRedirectPath("https://attacker.test/" )).toBe("/dashboard");
  });
}
);
