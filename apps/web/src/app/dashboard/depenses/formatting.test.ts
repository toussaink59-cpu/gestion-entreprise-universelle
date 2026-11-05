import { describe, expect, it } from "vitest";
import { formatExpenseCurrency, formatExpenseDate } from "./formatting";
describe("formatExpense helpers", () => {
  it("formats currencies in the requested locale", () => {
    const amount = 1234.5;
    expect(formatExpenseCurrency(amount, "XOF", "en")).toBe(new Intl.NumberFormat("en-GB", { style: "currency", currency: "XOF", maximumFractionDigits: 4 }).format(amount));
    expect(formatExpenseCurrency(amount, "XOF", "fr")).toBe(new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 4 }).format(amount));
    expect(formatExpenseCurrency(amount, "XOF", "fr")).not.toBe(formatExpenseCurrency(amount, "XOF", "en"));
  });
  it("formats dates and invalid values in the requested locale", () => {
    const timestamp = Date.parse("2026-11-05T00:00:00.000Z");
    expect(formatExpenseDate("2026-11-05", "en")).toBe(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp));
    expect(formatExpenseDate("invalid", "en")).toBe("Date unavailable");
    expect(formatExpenseCurrency("invalid", "XOF", "en")).toBe("Amount unavailable");
  });
});
