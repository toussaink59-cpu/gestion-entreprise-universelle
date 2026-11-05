export type FormatLocale = "fr" | "en";

function intlLocale(locale: FormatLocale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}

export function formatExpenseCurrency(amount: string | number, currencyCode: string, locale: FormatLocale = "fr"): string {
  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) return locale === "en" ? "Amount unavailable" : "Montant indisponible";
  try {
    return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: currencyCode, maximumFractionDigits: 4 }).format(numericAmount);
  } catch {
    return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 4 }).format(numericAmount) + " " + currencyCode;
  }
}

export function formatExpenseDate(value: string, locale: FormatLocale = "fr"): string {
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(timestamp)) return locale === "en" ? "Date unavailable" : "Date indisponible";
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp);
}

export function todayInTimezone(timezone: string): string {
  const safeTimezone = timezone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: safeTimezone }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
}
