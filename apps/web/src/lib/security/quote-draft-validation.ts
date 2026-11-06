export type QuoteDiscountType = "none" | "percentage" | "fixed";

export type ParsedQuoteDraftLine = {
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  discount_type: QuoteDiscountType;
  discount_value: string;
};

export type ParsedQuoteDraftSubmission = {
  companyId: string;
  customerId: string;
  quoteId: string | null;
  issueDate: string;
  validUntil: string;
  subject: string | null;
  terms: string | null;
  notes: string | null;
  lines: ParsedQuoteDraftLine[];
};

export type QuoteDraftParseResult =
  | { ok: true; data: ParsedQuoteDraftSubmission }
  | { ok: false; reason: "context" | "fields" | "lines" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function readOptionalText(
  formData: FormData,
  name: string,
  maxLength: number,
): string | null | undefined {
  const raw = readString(formData, name);
  if (raw === null) return undefined;
  const value = raw.trim();
  if (value.length > maxLength) return undefined;
  return value || null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

function normalizeDecimal(
  raw: unknown,
  maxIntegerDigits: number,
  mustBePositive: boolean,
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().replace(",", ".");
  const pattern = new RegExp(
    "^\\d{1," + maxIntegerDigits + "}(?:\\.\\d{1,4})?$",
  );
  if (!pattern.test(value)) return null;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  if (mustBePositive ? numericValue <= 0 : numericValue < 0) return null;
  return value;
}

/** Analyse stricte des lignes JSON ; réutilisée par les brouillons de facture. */
export function parseDraftLinesJson(raw: string | null): ParsedQuoteDraftLine[] | null {
  if (!raw || raw.length > 150_000) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 100) {
    return null;
  }

  const lines: ParsedQuoteDraftLine[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;

    const row = item as Record<string, unknown>;
    const description =
      typeof row.description === "string" ? row.description.trim() : "";
    const unitLabel =
      typeof row.unit_label === "string" ? row.unit_label.trim() : "";
    const quantity = normalizeDecimal(row.quantity, 14, true);
    const unitPrice = normalizeDecimal(row.unit_price, 16, false);
    const discountType = row.discount_type;
    const discountValue =
      discountType === "none"
        ? "0"
        : normalizeDecimal(row.discount_value, 16, false);

    if (
      description.length < 1 ||
      description.length > 500 ||
      unitLabel.length < 1 ||
      unitLabel.length > 40 ||
      quantity === null ||
      unitPrice === null ||
      (discountType !== "none" &&
        discountType !== "percentage" &&
        discountType !== "fixed") ||
      discountValue === null
    ) {
      return null;
    }

    if (
      discountType === "percentage" &&
      Number(discountValue) > 100
    ) {
      return null;
    }

    lines.push({
      description,
      quantity,
      unit_label: unitLabel,
      unit_price: unitPrice,
      discount_type: discountType,
      discount_value: discountValue,
    });
  }

  return lines;
}

/**
 * Strictly parses the browser submission. The database function remains the
 * authority for authorization, tenant ownership, line arithmetic and totals.
 * Tax fields are deliberately not accepted or forwarded in this phase.
 */
export function parseQuoteDraftForm(
  formData: FormData,
): QuoteDraftParseResult {
  const companyId = readString(formData, "company_id");
  const customerId = readString(formData, "customer_id");
  const rawQuoteId = readString(formData, "quote_id");
  const issueDate = readString(formData, "issue_date");
  const validUntil = readString(formData, "valid_until");

  if (
    !companyId ||
    !UUID_PATTERN.test(companyId) ||
    !customerId ||
    !UUID_PATTERN.test(customerId) ||
    rawQuoteId === null ||
    (rawQuoteId !== "" && !UUID_PATTERN.test(rawQuoteId)) ||
    issueDate === null ||
    validUntil === null
  ) {
    return { ok: false, reason: "context" };
  }

  if (
    !isValidDate(issueDate) ||
    !isValidDate(validUntil) ||
    validUntil < issueDate
  ) {
    return { ok: false, reason: "fields" };
  }

  const subject = readOptionalText(formData, "subject", 200);
  const terms = readOptionalText(formData, "terms", 5000);
  const notes = readOptionalText(formData, "notes", 5000);

  if (
    subject === undefined ||
    terms === undefined ||
    notes === undefined
  ) {
    return { ok: false, reason: "fields" };
  }

  const lines = parseDraftLinesJson(readString(formData, "lines_json"));
  if (!lines) return { ok: false, reason: "lines" };

  return {
    ok: true,
    data: {
      companyId,
      customerId,
      quoteId: rawQuoteId || null,
      issueDate,
      validUntil,
      subject,
      terms,
      notes,
      lines,
    },
  };
}
