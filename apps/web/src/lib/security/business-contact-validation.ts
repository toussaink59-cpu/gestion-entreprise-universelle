import { isValidEmail } from "./form-validation";

export type BusinessContactKind = "customer" | "supplier";

export type BusinessContactFields = {
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tax_identifier: string | null;
  address: string | null;
  city: string | null;
  country_code: string;
  payment_terms_days: number;
  notes: string | null;
};

export type BusinessContactFormResult =
  | {
      ok: true;
      kind: BusinessContactKind;
      companyId: string;
      fields: BusinessContactFields;
    }
  | { ok: false; reason: "context" }
  | {
      ok: false;
      reason: "fields";
      kind: BusinessContactKind;
      companyId: string;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OptionalTextResult = string | null | undefined;

function readString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function readOptionalText(
  formData: FormData,
  name: string,
  minLength: number,
  maxLength: number,
): OptionalTextResult {
  const raw = formData.get(name);
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;

  const value = raw.trim();
  if (!value) return null;
  if (value.length < minLength || value.length > maxLength) return undefined;
  return value;
}

/**
 * Validation commune au formulaire HTML et aux Server Actions.
 * Les contraintes de la base restent l'autorité finale.
 */
export function parseBusinessContactForm(
  formData: FormData,
): BusinessContactFormResult {
  const rawKind = readString(formData, "contact_kind");
  const rawCompanyId = readString(formData, "company_id");

  if (
    (rawKind !== "customer" && rawKind !== "supplier") ||
    !rawCompanyId ||
    !UUID_PATTERN.test(rawCompanyId)
  ) {
    return { ok: false, reason: "context" };
  }

  const name = readString(formData, "name")?.trim() ?? "";
  if (name.length < 2 || name.length > 200) {
    return {
      ok: false,
      reason: "fields",
      kind: rawKind,
      companyId: rawCompanyId,
    };
  }

  const contactName = readOptionalText(formData, "contact_name", 1, 150);
  const email = readOptionalText(formData, "email", 3, 254);
  const phone = readOptionalText(formData, "phone", 3, 40);
  const taxIdentifier = readOptionalText(formData, "tax_identifier", 1, 100);
  const address = readOptionalText(formData, "address", 1, 250);
  const city = readOptionalText(formData, "city", 1, 120);
  const notes = readOptionalText(formData, "notes", 0, 2000);

  const countryCodeRaw = readString(formData, "country_code");
  const countryCode = (countryCodeRaw?.trim() || "BF").toUpperCase();
  const paymentTermsRaw = readString(formData, "payment_terms_days") ?? "0";
  const paymentTerms = paymentTermsRaw.trim() || "0";
  const paymentTermsDays = /^\d{1,3}$/.test(paymentTerms)
    ? Number(paymentTerms)
    : Number.NaN;

  const optionalValues: OptionalTextResult[] = [
    contactName,
    email,
    phone,
    taxIdentifier,
    address,
    city,
    notes,
  ];

  if (
    optionalValues.some((value) => value === undefined) ||
    (email !== null && email !== undefined && !isValidEmail(email)) ||
    !/^[A-Z]{2}$/.test(countryCode) ||
    !Number.isInteger(paymentTermsDays) ||
    paymentTermsDays < 0 ||
    paymentTermsDays > 365
  ) {
    return {
      ok: false,
      reason: "fields",
      kind: rawKind,
      companyId: rawCompanyId,
    };
  }

  return {
    ok: true,
    kind: rawKind,
    companyId: rawCompanyId,
    fields: {
      name,
      contact_name: contactName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      tax_identifier: taxIdentifier ?? null,
      address: address ?? null,
      city: city ?? null,
      country_code: countryCode,
      payment_terms_days: paymentTermsDays,
      notes: notes ?? null,
    },
  };
}
