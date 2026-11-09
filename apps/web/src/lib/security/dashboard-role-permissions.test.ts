import { describe, expect, it } from "vitest";
import { canReadBusinessDashboard } from "./dashboard-role-permissions";

describe("dashboard business directory visibility", () => {
  it("does not expose business directory previews to employees", () => {
    expect(canReadBusinessDashboard("employee")).toBe(false);
  });

  it("allows previews only for roles with business read access", () => {
    for (const role of ["owner", "company_admin", "finance", "sales_purchasing", "auditor"]) {
      expect(canReadBusinessDashboard(role)).toBe(true);
    }
  });

  it("fails closed for unknown roles", () => {
    expect(canReadBusinessDashboard("unknown")).toBe(false);
    expect(canReadBusinessDashboard("")).toBe(false);
  });
});
