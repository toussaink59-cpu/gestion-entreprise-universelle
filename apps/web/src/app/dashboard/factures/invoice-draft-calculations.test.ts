import { describe, expect, it } from "vitest";
import {
  calculateInvoiceDraftTotals,
  type InvoiceDraftCalculationLine,
} from "./invoice-draft-calculations";

const validLine: InvoiceDraftCalculationLine = {
  quantity: "1",
  unit_price: "100",
  discount_type: "none",
  discount_value: "0",
};

describe("calculateInvoiceDraftTotals", () => {
  it("calculates a percentage discount", () => {
    const result = calculateInvoiceDraftTotals([
      {
        ...validLine,
        quantity: "2.5",
        unit_price: "1000",
        discount_type: "percentage",
        discount_value: "10",
      },
    ]);

    expect(result).toEqual({
      lines: [{
        baseAmount: "2500.0000",
        discountAmount: "250.0000",
        totalAmount: "2250.0000",
      }],
      subtotalAmount: "2500.0000",
      discountAmount: "250.0000",
      totalAmount: "2250.0000",
    });
  });

  it("calculates fixed discounts and combines multiple lines", () => {
    const result = calculateInvoiceDraftTotals([
      {
        ...validLine,
        quantity: "2",
        unit_price: "100",
        discount_type: "fixed",
        discount_value: "25.5",
      },
      {
        ...validLine,
        quantity: "3",
        unit_price: "50",
      },
    ]);

    expect(result).toEqual({
      lines: [
        {
          baseAmount: "200.0000",
          discountAmount: "25.5000",
          totalAmount: "174.5000",
        },
        {
          baseAmount: "150.0000",
          discountAmount: "0.0000",
          totalAmount: "150.0000",
        },
      ],
      subtotalAmount: "350.0000",
      discountAmount: "25.5000",
      totalAmount: "324.5000",
    });
  });

  it("accepts decimal commas", () => {
    const result = calculateInvoiceDraftTotals([{
      ...validLine,
      quantity: "2,5",
      unit_price: "1000,00",
      discount_type: "percentage",
      discount_value: "10,0",
    }]);

    expect(result?.totalAmount).toBe("2250.0000");
  });

  it("reproduces PostgreSQL rounding on line amounts", () => {
    const result = calculateInvoiceDraftTotals([{
      ...validLine,
      quantity: "0.0001",
      unit_price: "0.5",
    }]);

    expect(result?.lines[0].baseAmount).toBe("0.0001");
    expect(result?.totalAmount).toBe("0.0001");
  });

  it("rounds percentage discounts to four decimal places", () => {
    const result = calculateInvoiceDraftTotals([{
      ...validLine,
      quantity: "0.0001",
      unit_price: "1",
      discount_type: "percentage",
      discount_value: "50",
    }]);

    expect(result?.discountAmount).toBe("0.0001");
    expect(result?.totalAmount).toBe("0.0000");
  });

  it("accepts the maximum numeric(20,4) amount", () => {
    const result = calculateInvoiceDraftTotals([{
      ...validLine,
      unit_price: "9999999999999999.9999",
    }]);

    expect(result?.totalAmount).toBe("9999999999999999.9999");
  });

  it("rejects invalid quantities, prices and discounts", () => {
    const invalidLines: InvoiceDraftCalculationLine[] = [
      { ...validLine, quantity: "0" },
      { ...validLine, quantity: "-1" },
      { ...validLine, quantity: "1.00001" },
      { ...validLine, quantity: "100000000000000" },
      { ...validLine, unit_price: "-1" },
      { ...validLine, unit_price: "1.00001" },
      { ...validLine, unit_price: "10000000000000000" },
      { ...validLine, discount_type: "percentage", discount_value: "101" },
      { ...validLine, discount_type: "fixed", discount_value: "101" },
    ];

    for (const line of invalidLines) {
      expect(calculateInvoiceDraftTotals([line])).toBeNull();
    }
  });

  it("rejects empty invoices and more than 100 lines", () => {
    expect(calculateInvoiceDraftTotals([])).toBeNull();

    const tooManyLines = Array.from(
      { length: 101 },
      () => validLine,
    );

    expect(calculateInvoiceDraftTotals(tooManyLines)).toBeNull();
  });

  it("rejects an invoice total exceeding numeric(20,4)", () => {
    const result = calculateInvoiceDraftTotals([
      { ...validLine, unit_price: "6000000000000000" },
      { ...validLine, unit_price: "6000000000000000" },
    ]);

    expect(result).toBeNull();
  });
});