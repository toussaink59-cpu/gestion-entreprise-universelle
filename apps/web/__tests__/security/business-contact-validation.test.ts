import { describe, expect, it } from "vitest";
import { parseBusinessContactForm } from "../../src/lib/security/business-contact-validation";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

function makeForm(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    contact_kind: "customer",
    company_id: COMPANY_ID,
    name: "Entreprise Exemple",
    contact_name: "Awa Traoré",
    email: "contact@example.test",
    phone: "+226 70 00 00 00",
    tax_identifier: "IFU-12345",
    address: "Avenue de la Nation",
    city: "Ouagadougou",
    country_code: "bf",
    payment_terms_days: "30",
    notes: "Contact de démonstration",
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("parseBusinessContactForm", () => {
  it("normalise le code pays et retourne les champs attendus", () => {
    const result = parseBusinessContactForm(makeForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("customer");
    expect(result.companyId).toBe(COMPANY_ID);
    expect(result.fields.country_code).toBe("BF");
    expect(result.fields.payment_terms_days).toBe(30);
    expect(result.fields.name).toBe("Entreprise Exemple");
  });

  it("accepte les champs facultatifs vides comme null", () => {
    const result = parseBusinessContactForm(makeForm({
      contact_name: "",
      email: "",
      phone: "",
      tax_identifier: "",
      address: "",
      city: "",
      notes: "",
      payment_terms_days: "",
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields.contact_name).toBeNull();
    expect(result.fields.email).toBeNull();
    expect(result.fields.notes).toBeNull();
    expect(result.fields.payment_terms_days).toBe(0);
  });

  it("refuse un nom trop court", () => {
    expect(parseBusinessContactForm(makeForm({ name: " A " }))).toMatchObject({
      ok: false,
      reason: "fields",
    });
  });

  it("refuse un e-mail non valide", () => {
    expect(parseBusinessContactForm(makeForm({ email: "adresse-invalide" }))).toMatchObject({
      ok: false,
      reason: "fields",
    });
  });

  it("refuse un délai de paiement hors limites ou non entier", () => {
    for (const value of ["-1", "366", "30.5", "12jours"]) {
      expect(parseBusinessContactForm(makeForm({ payment_terms_days: value }))).toMatchObject({
        ok: false,
        reason: "fields",
      });
    }
  });

  it("refuse un contexte entreprise invalide", () => {
    expect(parseBusinessContactForm(makeForm({ company_id: "pas-un-uuid" }))).toEqual({
      ok: false,
      reason: "context",
    });
  });
});
