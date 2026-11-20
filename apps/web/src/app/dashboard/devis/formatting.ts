export type FormatLocale = "fr" | "en";

function intlLocale(locale: FormatLocale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}

const CURRENCY_SCALE = BigInt(10000);

function formatExactCurrencyString(
  amount: string,
  currencyCode: string,
  locale: FormatLocale,
): string | null {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!match) return null;

  const integerDigits = match[2];
  const rawFraction = match[3] ?? "";
  const fraction = rawFraction.slice(0, 4).padEnd(4, "0");

  let absolute = BigInt(integerDigits) * CURRENCY_SCALE + BigInt(fraction || "0");

  if (rawFraction.length > 4 && rawFraction[4] >= "5") {
    absolute += BigInt(1);
  }

  const scaled = match[1] === "-" ? -absolute : absolute;
  const negative = scaled < BigInt(0);
  const magnitude = negative ? -scaled : scaled;
  const integerPart = magnitude / CURRENCY_SCALE;
  const fractionPart = (magnitude % CURRENCY_SCALE)
    .toString()
    .padStart(4, "0");

  let integerFormatter: Intl.NumberFormat;
  let decimalFormatter: Intl.NumberFormat;
  let minimumFractionDigits = 0;
  let currencyFallback = false;

  try {
    const currencyFormatter = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 4,
    });

    integerFormatter = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    decimalFormatter = currencyFormatter;
    minimumFractionDigits =
      currencyFormatter.resolvedOptions().minimumFractionDigits ?? 0;
  } catch {
    currencyFallback = true;
    decimalFormatter = new Intl.NumberFormat(intlLocale(locale), {
      maximumFractionDigits: 4,
    });
    integerFormatter = new Intl.NumberFormat(intlLocale(locale), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  const signedInteger = negative
    ? integerPart === BigInt(0) ? BigInt(-1) : -integerPart
    : integerPart;

  let parts = integerFormatter.formatToParts(signedInteger);

  if (negative && integerPart === BigInt(0)) {
    const zero = integerFormatter.formatToParts(BigInt(0))
      .find((part) => part.type === "integer")?.value ?? "0";

    parts = parts.map((part) =>
      part.type === "integer" ? { ...part, value: zero } : part,
    );
  }

  const meaningfulDigits = fractionPart.replace(/0+$/, "").length;
  const fractionDigits = Math.max(minimumFractionDigits, meaningfulDigits);

  if (fractionDigits > 0) {
    const decimalSeparator = decimalFormatter.formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";

    let lastIntegerIndex = -1;
    for (let index = 0; index < parts.length; index += 1) {
      if (parts[index].type === "integer") lastIntegerIndex = index;
    }

    if (lastIntegerIndex < 0) return null;

    parts.splice(
      lastIntegerIndex + 1,
      0,
      { type: "decimal", value: decimalSeparator },
      { type: "fraction", value: fractionPart.slice(0, fractionDigits) },
    );
  }

  const formatted = parts.map((part) => part.value).join("");
  return currencyFallback ? formatted + " " + currencyCode : formatted;
}

export function formatQuoteCurrency(
  amount: string | number,
  currencyCode: string,
  locale: FormatLocale = "fr",
): string {
  if (typeof amount === "string") {
    const exact = formatExactCurrencyString(amount, currencyCode, locale);
    if (exact !== null) return exact;
  }

  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return locale === "en" ? "Amount unavailable" : "Montant indisponible";
  }

  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 4,
    }).format(numericAmount);
  } catch {
    return new Intl.NumberFormat(intlLocale(locale), {
      maximumFractionDigits: 4,
    }).format(numericAmount) + " " + currencyCode;
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