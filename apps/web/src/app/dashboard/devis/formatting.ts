export function formatQuoteCurrency(
  amount: string | number,
  currencyCode: string,
): string {
  const numericAmount =
    typeof amount === "number" ? amount : Number(amount);

  if (!Number.isFinite(numericAmount)) return "Montant indisponible";

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return (
      new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 4,
      }).format(numericAmount) +
      " " +
      currencyCode
    );
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 4,
  }).format(numericAmount);
}

export function formatQuoteDate(value: string): string {
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(timestamp)) return "Date indisponible";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

export function formatQuoteQuantity(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 4,
  }).format(numericValue);
}
