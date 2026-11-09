/**
 * UI mirror of the business read roles in public.role_permissions.
 * Supabase RLS and server-side permission checks remain authoritative.
 */
const BUSINESS_READ_ROLES = new Set([
  "owner",
  "company_admin",
  "finance",
  "sales_purchasing",
  "auditor",
]);

export function canReadBusinessDashboard(roleCode: string): boolean {
  return BUSINESS_READ_ROLES.has(roleCode);
}
