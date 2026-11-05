import { describe, expect, it, vi } from "vitest";
import {
  buildInvitationEmail,
  createInvitationToken,
  escapeHtml,
  hashInvitationToken,
  isValidInvitationToken,
  roleLabelForEmail,
  sendMemberInvitationEmail,
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
    expect(roleLabelForEmail("sales_purchasing", "en")).toBe("Sales / purchasing");
    expect(roleLabelForEmail("unlisted_role", "en")).toBe("Member");
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
    const englishEmail = buildInvitationEmail({ companyName: "Example Ltd", roleLabel: "Employee", inviterName: "Alice", acceptUrl: "https://example.test/invitations/accept?token=Abc", locale: "en" });
    expect(englishEmail.subject).toContain("Invitation to join");
    expect(englishEmail.html).toContain('<html lang="en">');
    expect(englishEmail.html).toContain("Confirm invitation");
    expect(englishEmail.text).toContain("Alice invited you to join Example Ltd");
    expect(englishEmail.text).toContain("The owner must still review and activate your access.");
  });

  it("inclut la langue demandée dans le lien e-mail", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-api-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "PolyGest <no-reply@example.test>");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://polygest.example");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-test-id" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const token = createInvitationToken().token;
      const result = await sendMemberInvitationEmail({
        to: "member@example.test",
        companyName: "Example Ltd",
        roleCode: "employee",
        inviterName: "Alice",
        locale: "en",
        token,
        idempotencyKey: "test-invitation-locale",
      });
      expect(result).toEqual({ ok: true, emailId: "email-test-id" });
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(payload.text).toContain(`/invitations/accept?token=${token}&locale=en`);
      expect(payload.html).toContain(`/invitations/accept?token=${token}&amp;locale=en`);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it("ne permet au redirect de retour que des chemins internes", () => {
    const token = createInvitationToken().token;
    const path = `/invitations/accept?token=${encodeURIComponent(token)}`;
    expect(getSafeRedirectPath(path)).toBe(path);
    expect(getSafeRedirectPath("https://attacker.test/" )).toBe("/dashboard");
  });
}
);
