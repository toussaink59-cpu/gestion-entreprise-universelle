export type FormatLocale = "fr" | "en";

function intlLocale(locale: FormatLocale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}

export function formatQuoteCurrency(amount: string | number, currencyCode: string, locale: FormatLocale = "fr"): string {
  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) return locale === "en" ? "Amount unavailable" : "Montant indisponible";
  try {
    return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: currencyCode, maximumFractionDigits: 4 }).format(numericAmount);
  } catch {
    return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 4 }).format(numericAmount) + " " + currencyCode;
  }
}

export function formatQuoteDate(value: string, locale: FormatLocale = "fr"): string {
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(timestamp)) return locale === "en" ? "Date unavailable" : "Date indisponible";
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp);
}

export function formatQuoteQuantity(value: string, locale: FormatLocale = "fr"): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 4 }).format(numericValue);
}

export function quoteStatusLabel(status: string, locale: FormatLocale = "fr"): string {
  const labels = locale === "en"
    ? { draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", cancelled: "Cancelled" }
    : { draft: "Brouillon", sent: "Transmis", accepted: "Accepté", rejected: "Refusé", cancelled: "Annulé" };
  return labels[status as keyof typeof labels] ?? (locale === "en" ? "Unknown status" : "Statut inconnu");
}
