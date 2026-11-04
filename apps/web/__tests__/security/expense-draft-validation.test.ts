import { describe, expect, it } from "vitest";
import { parseExpenseDraftForm } from "../../src/lib/security/expense-draft-validation";

const COMPANY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUPPLIER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("company_id", COMPANY_ID);
  form.set("expense_date", "2026-11-04");
  form.set("category", "Fournitures");
  form.set("description", "Achat de papier");
  form.set("amount", "12500");
  form.set("supplier_id", SUPPLIER_ID);
  form.set("notes", "Achat pour le bureau");

  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

describe("parseExpenseDraftForm", () => {
  it("normalise les décimales françaises et ne conserve que les champs autorisés", () => {
    const result = parseExpenseDraftForm(
      makeForm({
        amount: "12 500,75",
        payment_method: "cash",
        status: "paid",
        currency_code: "EUR",
        tax_rate: "18",
      }),
    );

    expect(result).toMatchObject({ ok: false, reason: "amount" });

    const valid = parseExpenseDraftForm(makeForm({ amount: "12500,75" }));
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect(valid.data.amount).toBe("12500.75");
    expect(valid.data).not.toHaveProperty("payment_method");
    expect(valid.data).not.toHaveProperty("status");
    expect(valid.data).not.toHaveProperty("currency_code");
    expect(valid.data).not.toHaveProperty("tax_rate");
  });

  it("accepte l'absence de fournisseur", () => {
    const result = parseExpenseDraftForm(makeForm({ supplier_id: "" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.supplierId).toBeNull();
  });

  it("refuse un contexte entreprise ou fournisseur invalide", () => {
    expect(
      parseExpenseDraftForm(makeForm({ company_id: "invalid" })),
    ).toMatchObject({ ok: false, reason: "context" });
    expect(
      parseExpenseDraftForm(makeForm({ supplier_id: "invalid" })),
    ).toMatchObject({ ok: false, reason: "context" });
  });

  it("refuse une date impossible", () => {
    expect(
      parseExpenseDraftForm(makeForm({ expense_date: "2026-02-30" })),
    ).toMatchObject({ ok: false, reason: "fields" });
  });

  it("refuse les montants nuls, négatifs, mal formés ou trop précis", () => {
    for (const amount of ["0", "0.0000", "-10", "10.12345", "1e6", "12 500"]) {
      expect(parseExpenseDraftForm(makeForm({ amount }))).toMatchObject({
        ok: false,
        reason: "amount",
      });
    }
  });

  it("refuse les champs texte vides ou trop longs", () => {
    expect(
      parseExpenseDraftForm(makeForm({ category: " " })),
    ).toMatchObject({ ok: false, reason: "fields" });
    expect(
      parseExpenseDraftForm(makeForm({ description: "x".repeat(501) })),
    ).toMatchObject({ ok: false, reason: "fields" });
    expect(
      parseExpenseDraftForm(makeForm({ notes: "x".repeat(2001) })),
    ).toMatchObject({ ok: false, reason: "fields" });
  });
});
