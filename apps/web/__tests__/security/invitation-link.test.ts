import { describe, expect, it } from "vitest";
import {
  invitationAcceptPath,
  parseInvitationLinkCookie,
  resolveAppOrigin,
} from "../../src/lib/email/invitation-link";
import { createInvitationToken } from "../../src/lib/email/member-invitation";

describe("lien d’invitation transmis à la main", () => {
  const inviterId = "123e4567-e89b-42d3-a456-426614174000";
  it("construit un chemin d’acceptation relisible depuis le cookie", () => {
    const { token } = createInvitationToken();
    const path = invitationAcceptPath(token);
    expect(path).toBe(`/invitations/accept?token=${token}`);
    expect(parseInvitationLinkCookie(`${inviterId}|${path}`, inviterId)).toBe(path);
  });

  it("transporte la langue dans le lien manuel et conserve le cookie associé", () => {
    const { token } = createInvitationToken();
    const path = invitationAcceptPath(token, "en");
    expect(path).toBe(`/invitations/accept?token=${token}&locale=en`);
    expect(parseInvitationLinkCookie(`${inviterId}|${path}`, inviterId)).toBe(path);
  });

  it("refuse un jeton mal formé", () => {
    expect(() => invitationAcceptPath("abc")).toThrow();
  });

  it.each([
    undefined,
    "",
    "https://evil.example/invitations/accept?token=" + "A".repeat(43),
    "//evil.example/x",
    "/invitations/accept?token=" + "A".repeat(42),
    "/invitations/accept?token=" + "A".repeat(43) + "&next=//evil.example",
    "/invitations/accept?token=" + "A".repeat(43) + "&locale=de",
    "/invitations/accept?token=" + "A".repeat(43) + "&locale=en&next=//evil.example",
    "/dashboard",
  ])("ignore un cookie falsifié (%s)", (value) => {
    expect(parseInvitationLinkCookie(value, inviterId)).toBeNull();
  });

  it("refuse un lien associé à un autre invitant", () => {
    const { token } = createInvitationToken();
    const path = invitationAcceptPath(token);
    expect(parseInvitationLinkCookie(`${inviterId}|${path}`, "123e4567-e89b-42d3-a456-426614174001")).toBeNull();
  });

  it("refuse un cookie ancien sans identité d’invitant", () => {
    const { token } = createInvitationToken();
    expect(parseInvitationLinkCookie(invitationAcceptPath(token), inviterId)).toBeNull();
  });

  it("refuse l’absence d’identité authentifiée", () => {
    const { token } = createInvitationToken();
    expect(parseInvitationLinkCookie(`${inviterId}|${invitationAcceptPath(token)}`, null)).toBeNull();
  });

  it("préfère NEXT_PUBLIC_APP_URL valide", () => {
    expect(resolveAppOrigin({ configuredUrl: "https://app.exemple.bf/", host: "autre.test" })).toBe(
      "https://app.exemple.bf",
    );
  });

  it("retombe sur l’hôte de la requête en https", () => {
    expect(resolveAppOrigin({ host: "polygest.vercel.app" })).toBe("https://polygest.vercel.app");
    expect(resolveAppOrigin({ configuredUrl: "ftp://x", host: "polygest.vercel.app" })).toBe(
      "https://polygest.vercel.app",
    );
  });

  it("accepte http uniquement en local", () => {
    expect(resolveAppOrigin({ host: "localhost:3000" })).toBe("http://localhost:3000");
    expect(resolveAppOrigin({ configuredUrl: "http://exemple.bf" })).toBeNull();
  });

  it.each(["", "evil.com/path", "a b", "evil.com@x.com", "x.com\r\nSet-Cookie: a=b"])(
    "refuse un hôte invalide (%s)",
    (host) => {
      expect(resolveAppOrigin({ host })).toBeNull();
    },
  );
});
