import { describe, expect, it } from "vitest";
import { decideOnboardingAccess } from "../../src/lib/security/onboarding-access";

describe("decideOnboardingAccess", () => {
  it("bloque la création si la requête d'appartenance échoue", () => {
    expect(decideOnboardingAccess(true, [])).toBe("error");
  });

  it("bloque la création si les données sont absentes sans erreur explicite", () => {
    expect(decideOnboardingAccess(false, null)).toBe("error");
  });

  it("redirige vers le tableau de bord si une appartenance existe", () => {
    expect(
      decideOnboardingAccess(false, [{ company_id: "company-1" }]),
    ).toBe("dashboard");
  });

  it("autorise l'onboarding après une vérification réussie sans appartenance", () => {
    expect(decideOnboardingAccess(false, [])).toBe("create-company");
  });
});