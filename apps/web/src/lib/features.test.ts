import { afterEach, describe, expect, it, vi } from "vitest";
import { isInvoiceModuleEnabled } from "./features";

describe("isInvoiceModuleEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when the environment flag is absent or false", () => {
    vi.stubEnv("POLYGEST_INVOICES_ENABLED", "false");
    expect(isInvoiceModuleEnabled()).toBe(false);
    vi.stubEnv("POLYGEST_INVOICES_ENABLED", "");
    expect(isInvoiceModuleEnabled()).toBe(false);
  });

  it("requires the explicit lowercase true value", () => {
    vi.stubEnv("POLYGEST_INVOICES_ENABLED", "TRUE");
    expect(isInvoiceModuleEnabled()).toBe(false);
    vi.stubEnv("POLYGEST_INVOICES_ENABLED", "1");
    expect(isInvoiceModuleEnabled()).toBe(false);
    vi.stubEnv("POLYGEST_INVOICES_ENABLED", "true");
    expect(isInvoiceModuleEnabled()).toBe(true);
  });
});
