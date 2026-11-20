export type InvoiceDraftCalculationLine = {
  quantity: string;
  unit_price: string;
  discount_type: "none" | "percentage" | "fixed";
  discount_value: string;
};

export type InvoiceDraftLineAmounts = {
  baseAmount: string;
  discountAmount: string;
  totalAmount: string;
};

export type InvoiceDraftTotals = {
  lines: InvoiceDraftLineAmounts[];
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
};

const SCALE = BigInt(10000);
const ZERO = BigInt(0);
const TWO = BigInt(2);
const MAX_NUMERIC_20_4 = BigInt("100000000000000000000") - BigInt(1);

function parseDecimal(
  raw: string,
  maxIntegerDigits: number,
  mustBePositive: boolean,
): bigint | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim().replace(",", ".");
  const pattern = new RegExp(
    "^\\d{1," + maxIntegerDigits + "}(?:\\.\\d{1,4})?$",
  );

  if (!pattern.test(value)) return null;

  const [integerPart, fractionPart = ""] = value.split(".");
  const scaled =
    BigInt(integerPart) * SCALE +
    BigInt(fractionPart.padEnd(4, "0"));

  if (mustBePositive ? scaled <= ZERO : scaled < ZERO) {
    return null;
  }

  return scaled;
}

// Reproduit l'arrondi PostgreSQL numeric pour les valeurs positives.
function roundPositive(
  numerator: bigint,
  denominator: bigint,
): bigint {
  return (numerator + denominator / TWO) / denominator;
}

function toDecimalString(value: bigint): string {
  const integerPart = value / SCALE;
  const fractionPart = (value % SCALE)
    .toString()
    .padStart(4, "0");

  return `${integerPart}.${fractionPart}`;
}

export function calculateInvoiceDraftTotals(
  lines: readonly InvoiceDraftCalculationLine[],
): InvoiceDraftTotals | null {
  if (lines.length < 1 || lines.length > 100) {
    return null;
  }

  let subtotal = ZERO;
  let discountTotal = ZERO;

  const calculatedLines: InvoiceDraftLineAmounts[] = [];

  for (const line of lines) {
    const quantity = parseDecimal(line.quantity, 14, true);
    const unitPrice = parseDecimal(line.unit_price, 16, false);

    if (quantity === null || unitPrice === null) {
      return null;
    }

    // Base = quantité × prix unitaire, arrondie à 4 décimales.
    const baseAmount = roundPositive(
      quantity * unitPrice,
      SCALE,
    );

    if (baseAmount > MAX_NUMERIC_20_4) {
      return null;
    }

    let discountAmount = ZERO;

    if (line.discount_type === "percentage") {
      const discountValue = parseDecimal(
        line.discount_value,
        16,
        false,
      );

      if (
        discountValue === null ||
        discountValue > BigInt(100) * SCALE
      ) {
        return null;
      }

      discountAmount = roundPositive(
        baseAmount * discountValue,
        BigInt(100) * SCALE,
      );
    } else if (line.discount_type === "fixed") {
      const discountValue = parseDecimal(
        line.discount_value,
        16,
        false,
      );

      if (discountValue === null) {
        return null;
      }

      discountAmount = discountValue;
    } else if (line.discount_type !== "none") {
      return null;
    }

    if (discountAmount > baseAmount) {
      return null;
    }

    const totalAmount = baseAmount - discountAmount;

    subtotal += baseAmount;
    discountTotal += discountAmount;

    if (
      subtotal > MAX_NUMERIC_20_4 ||
      discountTotal > MAX_NUMERIC_20_4
    ) {
      return null;
    }

    calculatedLines.push({
      baseAmount: toDecimalString(baseAmount),
      discountAmount: toDecimalString(discountAmount),
      totalAmount: toDecimalString(totalAmount),
    });
  }

  return {
    lines: calculatedLines,
    subtotalAmount: toDecimalString(subtotal),
    discountAmount: toDecimalString(discountTotal),
    totalAmount: toDecimalString(subtotal - discountTotal),
  };
}