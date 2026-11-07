import { parseDraftLinesJson, type ParsedQuoteDraftLine } from "./quote-draft-validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedInvoiceDraftSubmission = {
  companyId: string;
  customerId: string;
  issueDate: string;
  dueDate: string | null;
  subject: string | null;
  terms: string | null;
  notes: string | null;
  lines: ParsedQuoteDraftLine[];
};

export type InvoiceDraftParseResult =
  | { ok: true; data: ParsedInvoiceDraftSubmission }
  | { ok: false; reason: "context" | "fields" | "lines" };

function text(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function optionalText(formData: FormData, name: string, max: number): string | null | undefined {
  const raw = text(formData, name);
  if (raw === null) return undefined;
  const value = raw.trim();
  if (value.length > max) return undefined;
  return value || null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

/**
 * Préfiltre côté serveur d'un brouillon de facture autonome. Les taxes ne sont
 * ni acceptées ni transmises ; la fonction SQL reste l'autorité (droits,
 * entreprise, calculs).
 */
export function parseInvoiceDraftForm(formData: FormData): InvoiceDraftParseResult {
  const companyId = text(formData, "company_id");
  const customerId = text(formData, "customer_id");
  const issueDate = text(formData, "issue_date");
  const rawDue = text(formData, "due_date");

  if (!companyId || !UUID_PATTERN.test(companyId) || !customerId || !UUID_PATTERN.test(customerId) || issueDate === null || rawDue === null) {
    return { ok: false, reason: "context" };
  }

  const dueDate = rawDue.trim() === "" ? null : rawDue.trim();
  if (!isValidDate(issueDate) || (dueDate !== null && (!isValidDate(dueDate) || dueDate < issueDate))) {
    return { ok: false, reason: "fields" };
  }

  const subject = optionalText(formData, "subject", 200);
  const terms = optionalText(formData, "terms", 5000);
  const notes = optionalText(formData, "notes", 5000);
  if (subject === undefined || terms === undefined || notes === undefined) {
    return { ok: false, reason: "fields" };
  }

  const lines = parseDraftLinesJson(text(formData, "lines_json"));
  if (!lines) return { ok: false, reason: "lines" };

  return { ok: true, data: { companyId, customerId, issueDate, dueDate, subject, terms, notes, lines } };
}

export type InvoiceQuoteSourceParse =
  | { ok: true; companyId: string; quoteId: string }
  | { ok: false };

/** Création d'un brouillon à partir d'un devis accepté (identifiants seulement). */
export function parseInvoiceFromQuoteForm(formData: FormData): InvoiceQuoteSourceParse {
  const companyId = text(formData, "company_id");
  const quoteId = text(formData, "quote_id");
  if (!companyId || !UUID_PATTERN.test(companyId) || !quoteId || !UUID_PATTERN.test(quoteId)) return { ok: false };
  return { ok: true, companyId, quoteId };
}

export type InvoiceAbandonParse =
  | { ok: true; companyId: string; invoiceId: string; reason: string }
  | { ok: false; reason: "context" | "reason" };

/** Abandon d'un brouillon : motif obligatoire de 3 à 500 caractères. */
export function parseInvoiceAbandonForm(formData: FormData): InvoiceAbandonParse {
  const companyId = text(formData, "company_id");
  const invoiceId = text(formData, "invoice_id");
  if (!companyId || !UUID_PATTERN.test(companyId) || !invoiceId || !UUID_PATTERN.test(invoiceId)) {
    return { ok: false, reason: "context" };
  }
  const reason = (text(formData, "reason") ?? "").trim();
  if (reason.length < 3 || reason.length > 500) return { ok: false, reason: "reason" };
  return { ok: true, companyId, invoiceId, reason };
}
