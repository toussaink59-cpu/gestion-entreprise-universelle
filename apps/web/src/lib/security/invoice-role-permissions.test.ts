import { describe, expect, it } from "vitest";
import { canReadInvoices, canWriteInvoices } from "./invoice-role-permissions";

describe("invoice role permissions", () => {
  it("keeps sales_purchasing read-only, matching the database matrix", () => {
    expect(canReadInvoices("sales_purchasing")).toBe(true);
    expect(canWriteInvoices("sales_purchasing")).toBe(false);
  });

  it("allows invoice writes only for owner, company_admin and finance", () => {
    for (const role of ["owner", "company_admin", "finance"]) {
      expect(canReadInvoices(role)).toBe(true);
      expect(canWriteInvoices(role)).toBe(true);
    }
  });

  it("keeps auditors read-only and employee access denied", () => {
    expect(canReadInvoices("auditor")).toBe(true);
    expect(canWriteInvoices("auditor")).toBe(false);
    expect(canReadInvoices("employee")).toBe(false);
    expect(canWriteInvoices("employee")).toBe(false);
  });
});
