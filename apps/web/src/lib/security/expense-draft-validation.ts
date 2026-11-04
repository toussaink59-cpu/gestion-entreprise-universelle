export type ParsedExpenseDraftSubmission = {
  companyId: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  supplierId: string | null;
  notes: string | null;
};

export type ExpenseDraftParseResult =
  | { ok: true; data: ParsedExpenseDraftSubmission }
  | { ok: false; reason: "context" | "fields" | "amount" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

function normalizePositiveAmount(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim().replace(",", ".");
  if (!/^\d{1,16}(?:\.\d{1,4})?$/.test(value)) return null;
  if (!/[1-9]/.test(value)) return null;
  return value;
}

/**
 * Strictly parses the browser form. The database function remains authoritative
 * for permissions, supplier ownership, company currency and persisted values.
 * No tax, payment method, paid status or treasury movement is accepted here.
 */
export function parseExpenseDraftForm(
  formData: FormData,
): ExpenseDraftParseResult {
  const companyId = readString(formData, "company_id");
  const expenseDate = readString(formData, "expense_date");
  const rawSupplierId = readString(formData, "supplier_id");

  if (
    !companyId ||
    !UUID_PATTERN.test(companyId) ||
    expenseDate === null ||
    rawSupplierId === null ||
    (rawSupplierId !== "" && !UUID_PATTERN.test(rawSupplierId))
  ) {
    return { ok: false, reason: "context" };
  }

  if (!isValidDate(expenseDate)) {
    return { ok: false, reason: "fields" };
  }

  const categoryRaw = readString(formData, "category");
  const descriptionRaw = readString(formData, "description");
  const notesRaw = readString(formData, "notes");
  const amount = normalizePositiveAmount(readString(formData, "amount"));

  if (!amount) return { ok: false, reason: "amount" };
  if (
    categoryRaw === null ||
    descriptionRaw === null ||
    notesRaw === null
  ) {
    return { ok: false, reason: "fields" };
  }

  const category = categoryRaw.trim();
  const description = descriptionRaw.trim();
  const notes = notesRaw.trim();

  if (
    category.length < 2 ||
    category.length > 100 ||
    description.length < 2 ||
    description.length > 500 ||
    notes.length > 2000
  ) {
    return { ok: false, reason: "fields" };
  }

  return {
    ok: true,
    data: {
      companyId,
      expenseDate,
      category,
      description,
      amount,
      supplierId: rawSupplierId || null,
      notes: notes || null,
    },
  };
}
