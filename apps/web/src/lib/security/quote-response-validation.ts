import { readStringField } from "./form-validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const QUOTE_RESPONSE_METHODS = [
  "email",
  "whatsapp",
  "phone",
  "signed_document",
  "in_person",
  "other",
] as const;

export type QuoteResponseMethod = (typeof QUOTE_RESPONSE_METHODS)[number];

export const QUOTE_RESPONSE_METHOD_LABELS: Record<QuoteResponseMethod, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  phone: "Téléphone",
  signed_document: "Document signé",
  in_person: "En personne",
  other: "Autre",
};

export type QuoteResponseParse =
  | {
      ok: true;
      companyId: string;
      quoteId: string;
      decision: "accepted" | "rejected";
      method: QuoteResponseMethod | null;
      reference: string | null;
    }
  | { ok: false; reason: "context" | "decision" | "method" | "reference" };

/** Préfiltre côté serveur : les fonctions SQL restent l'autorité finale. */
export function parseQuoteResponseForm(formData: FormData): QuoteResponseParse {
  const companyId = readStringField(formData, "company_id");
  const quoteId = readStringField(formData, "quote_id");
  if (
    companyId === null || !UUID_PATTERN.test(companyId) ||
    quoteId === null || !UUID_PATTERN.test(quoteId)
  ) {
    return { ok: false, reason: "context" };
  }

  const decision = readStringField(formData, "decision");
  if (decision !== "accepted" && decision !== "rejected") {
    return { ok: false, reason: "decision" };
  }

  const methodField = (readStringField(formData, "method") ?? "").trim();
  let method: QuoteResponseMethod | null = null;
  if (methodField !== "") {
    if (!QUOTE_RESPONSE_METHODS.includes(methodField as QuoteResponseMethod)) {
      return { ok: false, reason: "method" };
    }
    method = methodField as QuoteResponseMethod;
  }

  const referenceField = (readStringField(formData, "reference") ?? "").trim();
  if (referenceField.length > 200) return { ok: false, reason: "reference" };
  const reference = referenceField === "" ? null : referenceField;

  if (decision === "accepted" && (method === null || reference === null)) {
    return { ok: false, reason: method === null ? "method" : "reference" };
  }

  return { ok: true, companyId, quoteId, decision, method, reference };
}

export type QuoteCancellationParse =
  | { ok: true; companyId: string; quoteId: string; reason: string }
  | { ok: false; reason: "context" | "motif" };

export function parseQuoteCancellationForm(formData: FormData): QuoteCancellationParse {
  const companyId = readStringField(formData, "company_id");
  const quoteId = readStringField(formData, "quote_id");
  if (
    companyId === null || !UUID_PATTERN.test(companyId) ||
    quoteId === null || !UUID_PATTERN.test(quoteId)
  ) {
    return { ok: false, reason: "context" };
  }
  const reason = (readStringField(formData, "cancellation_reason") ?? "").trim();
  if (reason.length < 3 || reason.length > 500) return { ok: false, reason: "motif" };
  return { ok: true, companyId, quoteId, reason };
}
