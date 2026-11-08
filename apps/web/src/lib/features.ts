/**
 * Feature gates for server-rendered application modules.
 *
 * Invoices stay disabled unless the database migration and its smoke tests
 * have been completed in the target environment.
 */
export function isInvoiceModuleEnabled(): boolean {
  return process.env.POLYGEST_INVOICES_ENABLED === "true";
}
