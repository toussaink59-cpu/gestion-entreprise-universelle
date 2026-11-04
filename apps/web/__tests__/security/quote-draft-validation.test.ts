import { describe, expect, it } from "vitest";
import { parseQuoteDraftForm } from "../../src/lib/security/quote-draft-validation";

const COMPANY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CUSTOMER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const QUOTE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function makeForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("company_id", COMPANY_ID);
  form.set("customer_id", CUSTOMER_ID);
  form.set("quote_id", "");
  form.set("issue_date", "2026-11-04");
  form.set("valid_until", "2026-12-04");
  form.set("subject", "Maintenance préventive");
  form.set("terms", "Paiement selon conditions convenues.");
  form.set("notes", "");
  form.set(
    "lines_json",
    JSON.stringify([
      {
        description: "Intervention technique",
        quantity: "2",
        unit_label: "jour",
        unit_price: "12500",
        discount_type: "percentage",
        discount_value: "10",
      },
    ]),
  );

  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

describe("parseQuoteDraftForm", () => {
  it("normalise les décimales françaises et conserve uniquement les champs autorisés", () => {
    const form = makeForm({
      lines_json: JSON.stringify([
        {
          description: "  Intervention  ",
          quantity: "1,5",
          unit_label: "heure",
          unit_price: "2500,75",
          discount_type: "none",
          discount_value: "999",
          tax_rate: "18",
          tax_label: "TVA",
        },
      ]),
    });

    const result = parseQuoteDraftForm(form);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lines[0]).toEqual({
      description: "Intervention",
      quantity: "1.5",
      unit_label: "heure",
      unit_price: "2500.75",
      discount_type: "none",
      discount_value: "0",
    });
    expect(result.data.lines[0]).not.toHaveProperty("tax_rate");
    expect(result.data.lines[0]).not.toHaveProperty("tax_label");
  });

  it("accepte un identifiant de brouillon valide pour la modification", () => {
    const result = parseQuoteDraftForm(makeForm({ quote_id: QUOTE_ID }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.quoteId).toBe(QUOTE_ID);
  });

  it("refuse un contexte d'entreprise ou de client invalide", () => {
    expect(
      parseQuoteDraftForm(makeForm({ company_id: "not-a-uuid" })),
    ).toMatchObject({ ok: false, reason: "context" });
    expect(
      parseQuoteDraftForm(makeForm({ customer_id: "not-a-uuid" })),
    ).toMatchObject({ ok: false, reason: "context" });
  });

  it("refuse des dates invalides ou une date de validité antérieure", () => {
    expect(
      parseQuoteDraftForm(makeForm({ issue_date: "2026-02-30" })),
    ).toMatchObject({ ok: false, reason: "fields" });
    expect(
      parseQuoteDraftForm(
        makeForm({
          issue_date: "2026-11-05",
          valid_until: "2026-11-04",
        }),
      ),
    ).toMatchObject({ ok: false, reason: "fields" });
  });

  it("refuse une quantité nulle, négative ou une précision supérieure à quatre décimales", () => {
    const zero = makeForm({
      lines_json: JSON.stringify([
        {
          description: "Ligne",
          quantity: "0",
          unit_label: "unité",
          unit_price: "10",
          discount_type: "none",
          discount_value: "0",
        },
      ]),
    });
    const negative = makeForm({
      lines_json: JSON.stringify([
        {
          description: "Ligne",
          quantity: "-1",
          unit_label: "unité",
          unit_price: "10",
          discount_type: "none",
          discount_value: "0",
        },
      ]),
    });
    const precision = makeForm({
      lines_json: JSON.stringify([
        {
          description: "Ligne",
          quantity: "1.00001",
          unit_label: "unité",
          unit_price: "10",
          discount_type: "none",
          discount_value: "0",
        },
      ]),
    });

    expect(parseQuoteDraftForm(zero)).toMatchObject({
      ok: false,
      reason: "lines",
    });
    expect(parseQuoteDraftForm(negative)).toMatchObject({
      ok: false,
      reason: "lines",
    });
    expect(parseQuoteDraftForm(precision)).toMatchObject({
      ok: false,
      reason: "lines",
    });
  });

  it("refuse les remises en pourcentage supérieures à 100", () => {
    const form = makeForm({
      lines_json: JSON.stringify([
        {
          description: "Ligne",
          quantity: "1",
          unit_label: "unité",
          unit_price: "10",
          discount_type: "percentage",
          discount_value: "100.01",
        },
      ]),
    });

    expect(parseQuoteDraftForm(form)).toMatchObject({
      ok: false,
      reason: "lines",
    });
  });

  it("refuse une liste vide ou plus de 100 lignes", () => {
    expect(
      parseQuoteDraftForm(makeForm({ lines_json: "[]" })),
    ).toMatchObject({ ok: false, reason: "lines" });

    const many = Array.from({ length: 101 }, () => ({
      description: "Ligne",
      quantity: "1",
      unit_label: "unité",
      unit_price: "10",
      discount_type: "none",
      discount_value: "0",
    }));
    expect(
      parseQuoteDraftForm(makeForm({ lines_json: JSON.stringify(many) })),
    ).toMatchObject({ ok: false, reason: "lines" });
  });

  it("refuse un type de remise inconnu et les champs texte trop longs", () => {
    const invalidDiscount = makeForm({
      lines_json: JSON.stringify([
        {
          description: "Ligne",
          quantity: "1",
          unit_label: "unité",
          unit_price: "10",
          discount_type: "arbitrary",
          discount_value: "0",
        },
      ]),
    });
    expect(parseQuoteDraftForm(invalidDiscount)).toMatchObject({
      ok: false,
      reason: "lines",
    });

    expect(
      parseQuoteDraftForm(makeForm({ subject: "x".repeat(201) })),
    ).toMatchObject({ ok: false, reason: "fields" });
  });
});
