import { describe, expect, it } from "vitest";
import { parseInvoiceAbandonForm, parseInvoiceDraftForm, parseInvoiceFromQuoteForm } from "./invoice-draft-validation";

const COMPANY = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const LINE = { description: "Prestation", quantity: "2", unit_label: "jour", unit_price: "10000", discount_type: "none", discount_value: "0" };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const base = { company_id: COMPANY, customer_id: CUSTOMER, issue_date: "2026-11-06", due_date: "", subject: "", terms: "", notes: "", lines_json: JSON.stringify([LINE]) };

describe("parseInvoiceDraftForm", () => {
  it("accepte un brouillon valide sans échéance et normalise les textes", () => {
    const parsed = parseInvoiceDraftForm(form({ ...base, subject: "  Objet  ", terms: "", notes: "Note" }));
    expect(parsed).toMatchObject({ ok: true, data: { dueDate: null, subject: "Objet", terms: null, notes: "Note" } });
  });

  it("refuse les identifiants invalides, dates impossibles et échéance antérieure", () => {
    expect(parseInvoiceDraftForm(form({ ...base, company_id: "x" }))).toEqual({ ok: false, reason: "context" });
    expect(parseInvoiceDraftForm(form({ ...base, customer_id: "" }))).toEqual({ ok: false, reason: "context" });
    expect(parseInvoiceDraftForm(form({ ...base, issue_date: "2026-02-30" }))).toEqual({ ok: false, reason: "fields" });
    expect(parseInvoiceDraftForm(form({ ...base, due_date: "2026-11-05" }))).toEqual({ ok: false, reason: "fields" });
    expect(parseInvoiceDraftForm(form({ ...base, due_date: "demain" }))).toEqual({ ok: false, reason: "fields" });
  });

  it("refuse les textes trop longs et les lignes invalides", () => {
    expect(parseInvoiceDraftForm(form({ ...base, subject: "x".repeat(201) }))).toEqual({ ok: false, reason: "fields" });
    expect(parseInvoiceDraftForm(form({ ...base, lines_json: "[]" }))).toEqual({ ok: false, reason: "lines" });
    expect(parseInvoiceDraftForm(form({ ...base, lines_json: JSON.stringify([{ ...LINE, unit_price: "-1" }]) }))).toEqual({ ok: false, reason: "lines" });
    expect(parseInvoiceDraftForm(form({ ...base, lines_json: JSON.stringify([{ ...LINE, quantity: "NaN" }]) }))).toEqual({ ok: false, reason: "lines" });
  });

  it("distingue création et modification d'un brouillon", () => {
    const INVOICE = "33333333-3333-4333-8333-333333333333";
    expect(parseInvoiceDraftForm(form(base))).toMatchObject({ ok: true, data: { invoiceId: null } });
    expect(parseInvoiceDraftForm(form({ ...base, invoice_id: "" }))).toMatchObject({ ok: true, data: { invoiceId: null } });
    expect(parseInvoiceDraftForm(form({ ...base, invoice_id: INVOICE }))).toMatchObject({ ok: true, data: { invoiceId: INVOICE } });
    expect(parseInvoiceDraftForm(form({ ...base, invoice_id: "1; drop table" }))).toEqual({ ok: false, reason: "context" });
  });

  it("ne transmet jamais de taxe", () => {
    const parsed = parseInvoiceDraftForm(form({ ...base, lines_json: JSON.stringify([{ ...LINE, tax_rate: "18" }]) }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(JSON.stringify(parsed.data.lines)).not.toContain("tax");
  });
});

describe("parseInvoiceFromQuoteForm / parseInvoiceAbandonForm", () => {
  it("exige deux identifiants valides pour facturer un devis", () => {
    expect(parseInvoiceFromQuoteForm(form({ company_id: COMPANY, quote_id: CUSTOMER }))).toEqual({ ok: true, companyId: COMPANY, quoteId: CUSTOMER });
    expect(parseInvoiceFromQuoteForm(form({ company_id: COMPANY, quote_id: "../x" }))).toEqual({ ok: false });
    expect(parseInvoiceFromQuoteForm(form({ company_id: COMPANY }))).toEqual({ ok: false });
  });

  it("exige un motif d'abandon de 3 à 500 caractères", () => {
    const ok = { company_id: COMPANY, invoice_id: CUSTOMER };
    expect(parseInvoiceAbandonForm(form({ ...ok, reason: "  Erreur de client " }))).toMatchObject({ ok: true, reason: "Erreur de client" });
    expect(parseInvoiceAbandonForm(form({ ...ok, reason: "ab" }))).toEqual({ ok: false, reason: "reason" });
    expect(parseInvoiceAbandonForm(form({ ...ok, reason: "x".repeat(501) }))).toEqual({ ok: false, reason: "reason" });
    expect(parseInvoiceAbandonForm(form({ company_id: "x", invoice_id: CUSTOMER, reason: "Motif" }))).toEqual({ ok: false, reason: "context" });
  });
});
