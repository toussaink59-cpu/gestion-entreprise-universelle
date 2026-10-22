import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "../../src/lib/security/safe-redirect";

describe("getSafeRedirectPath", () => {
  it("autorise un chemin interne avec query et hash", () => {
    expect(getSafeRedirectPath("/dashboard?tab=members#details")).toBe(
      "/dashboard?tab=members#details",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "javascript:alert(1)",
    "dashboard",
    "",
  ])("rejette une destination externe ou invalide : %s", (candidate) => {
    expect(getSafeRedirectPath(candidate)).toBe("/dashboard");
  });

  it("utilise le fallback pour une valeur absente", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
  });

  it("permet un fallback interne personnalise", () => {
    expect(getSafeRedirectPath("//evil.example", "/login")).toBe("/login");
  });
});