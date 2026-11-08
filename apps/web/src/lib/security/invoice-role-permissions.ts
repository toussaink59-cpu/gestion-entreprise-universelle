/**
 * UI mirror of the effective invoices permissions from role_permissions.
 * Database functions and RLS remain the authorization authority.
 */
const INVOICE_READ_ROLES = new Set([
  "owner",
  "company_admin",
  "finance",
  "sales_purchasing",
  "auditor",
]);

const INVOICE_WRITE_ROLES = new Set([
  "owner",
  "company_admin",
  "finance",
]);

export function canReadInvoices(roleCode: string): boolean {
  return INVOICE_READ_ROLES.has(roleCode);
}

export function canWriteInvoices(roleCode: string): boolean {
  return INVOICE_WRITE_ROLES.has(roleCode);
}
