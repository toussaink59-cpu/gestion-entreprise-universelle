import { describe, expect, it } from "vitest";
import { formatQuoteCurrency } from "./formatting";

describe("formatQuoteCurrency exact decimal strings", () => {
  it("preserves precision beyond Number.MAX_SAFE_INTEGER", () => {
    expect(
      formatQuoteCurrency("9007199254740993.1234", "EUR", "en"),
    ).toBe("€9,007,199,254,740,993.1234");
  });

  it("rounds decimal strings to four fractional digits", () => {
    expect(formatQuoteCurrency("1.23456", "EUR", "en"))
      .toBe("€1.2346");
  });

  it("respects currency-specific minimum fraction digits", () => {
    expect(formatQuoteCurrency("1.5", "EUR", "en"))
      .toBe("€1.50");

    expect(formatQuoteCurrency("1234.5", "XOF", "fr"))
      .toBe(formatQuoteCurrency(1234.5, "XOF", "fr"));
  });

  it("preserves precision with an invalid currency fallback", () => {
    expect(
      formatQuoteCurrency("9007199254740993.1234", "INVALID", "en"),
    ).toBe("9,007,199,254,740,993.1234 INVALID");
  });

  it("rounds negative sub-unit values away from zero", () => {
    expect(formatQuoteCurrency("-0.00005", "EUR", "en"))
      .toBe("-€0.0001");
  });

  it("keeps the invalid amount fallback", () => {
    expect(formatQuoteCurrency("invalid", "EUR", "en"))
      .toBe("Amount unavailable");
  });
});
