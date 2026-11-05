import { describe, expect, it } from "vitest";
import {
  parseQuoteCancellationForm,
  parseQuoteResponseForm,
} from "../../src/lib/security/quote-response-validation";

const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const QUOTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  f.set("company_id", COMPANY);
  f.set("quote_id", QUOTE);
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("réponse du client — validation du formulaire", () => {
  it("accepte une acceptation complète", () => {
    const r = parseQuoteResponseForm(form({ decision: "accepted", method: "email", reference: "  Courriel du 5 nov.  " }));
    expect(r).toMatchObject({ ok: true, decision: "accepted", method: "email", reference: "Courriel du 5 nov." });
  });

  it("accepte un refus sans méthode ni référence", () => {
    expect(parseQuoteResponseForm(form({ decision: "rejected" }))).toMatchObject({
      ok: true, decision: "rejected", method: null, reference: null,
    });
  });

  it.each([
    [{ decision: "accepted", method: "email" }, "reference"],
    [{ decision: "accepted", reference: "x" }, "method"],
    [{ decision: "accepted", method: "pigeon", reference: "x" }, "method"],
    [{ decision: "maybe" }, "decision"],
    [{ decision: "accepted", method: "email", reference: "x".repeat(201) }, "reference"],
    [{ decision: "rejected", method: "pigeon" }, "method"],
  ])("refuse %j", (fields, reason) => {
    expect(parseQuoteResponseForm(form(fields))).toEqual({ ok: false, reason });
  });

  it("refuse un identifiant invalide", () => {
    const f = form({ decision: "rejected" });
    f.set("quote_id", "pas-un-uuid");
    expect(parseQuoteResponseForm(f)).toEqual({ ok: false, reason: "context" });
  });
});

describe("annulation — validation du formulaire", () => {
  it("accepte un motif de 3 à 500 caractères", () => {
    expect(parseQuoteCancellationForm(form({ cancellation_reason: " Erreur de prix " }))).toMatchObject({
      ok: true, reason: "Erreur de prix",
    });
  });
  it.each(["", "  a ", "x".repeat(501)])("refuse le motif %j", (reason) => {
    expect(parseQuoteCancellationForm(form({ cancellation_reason: reason }))).toEqual({ ok: false, reason: "motif" });
  });
});
