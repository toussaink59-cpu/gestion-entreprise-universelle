import { describe, expect, it } from "vitest";
import { formatQuoteCurrency, formatQuoteDate, formatQuoteQuantity, quoteStatusLabel } from "./formatting";
describe("formatQuote helpers", () => {
  it("formats currency using the requested locale", () => {
    const amount = 1234.5;
    expect(formatQuoteCurrency(amount, "XOF", "fr")).toBe(new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 4 }).format(amount));
    expect(formatQuoteCurrency(amount, "XOF", "en")).toBe(new Intl.NumberFormat("en-GB", { style: "currency", currency: "XOF", maximumFractionDigits: 4 }).format(amount));
    expect(formatQuoteCurrency(amount, "XOF", "fr")).not.toBe(formatQuoteCurrency(amount, "XOF", "en"));
  });
  it("formats dates and quantities per locale with a stable UTC date-only value", () => {
    const timestamp = Date.parse("2026-11-05T00:00:00.000Z");
    expect(formatQuoteDate("2026-11-05", "en")).toBe(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp));
    expect(formatQuoteDate("2026-11-05", "fr")).not.toBe(formatQuoteDate("2026-11-05", "en"));
    expect(formatQuoteQuantity("1234.5", "en")).toBe("1,234.5");
    expect(formatQuoteQuantity("1234.5", "fr")).toBe("1 234,5");
  });
  it("localizes status and invalid-value fallbacks", () => {
    expect(quoteStatusLabel("draft", "en")).toBe("Draft");
    expect(quoteStatusLabel("draft", "fr")).toBe("Brouillon");
    expect(formatQuoteCurrency("invalid", "XOF", "en")).toBe("Amount unavailable");
    expect(formatQuoteDate("invalid", "en")).toBe("Date unavailable");
  });
});
