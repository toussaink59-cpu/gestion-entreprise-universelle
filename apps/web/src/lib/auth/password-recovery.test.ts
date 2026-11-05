import { describe, expect, it } from "vitest";
import { buildPasswordRecoveryCallbackUrl } from "./password-recovery";

describe("buildPasswordRecoveryCallbackUrl", () => {
  it("uses the configured application origin and English locale", () => {
    const result = new URL(
      buildPasswordRecoveryCallbackUrl("https://polygest.example/path?discard=1", "en"),
    );

    expect(result.origin).toBe("https://polygest.example");
    expect(result.pathname).toBe("/auth/callback");
    expect(result.searchParams.get("next")).toBe("/reset-password");
    expect(result.searchParams.get("locale")).toBe("en");
  });

  it("keeps the French locale and removes configured URL paths", () => {
    const result = new URL(
      buildPasswordRecoveryCallbackUrl("https://polygest.example/deep/path", "fr"),
    );

    expect(result.href).toBe(
      "https://polygest.example/auth/callback?next=%2Freset-password&locale=fr",
    );
  });

  it("uses localhost only when no public app URL is configured", () => {
    const result = new URL(buildPasswordRecoveryCallbackUrl(undefined, "fr"));
    expect(result.origin).toBe("http://localhost:3000");
    expect(result.pathname).toBe("/auth/callback");
  });

  it("rejects an invalid configured URL instead of falling back silently", () => {
    expect(() => buildPasswordRecoveryCallbackUrl("not a URL", "fr")).toThrow();
  });
});
