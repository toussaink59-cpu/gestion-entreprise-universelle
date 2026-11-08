import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isInvoiceModuleEnabled } from "@/lib/features";
import { canReadInvoices, canWriteInvoices } from "@/lib/security/invoice-role-permissions";

export type InvoiceCompany = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  default_currency: string;
  status: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInvoiceUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function getInvoiceWorkspace(requestedCompanyId?: string) {
  if (!isInvoiceModuleEnabled()) notFound();

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id, role_code")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (membershipError) return { status: "error" as const };

  const membershipRows = memberships ?? [];
  if (membershipRows.length === 0) redirect("/onboarding");

  const companyIds = [...new Set(membershipRows.map((m) => m.company_id))];
  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency, status")
    .in("id", companyIds)
    .order("legal_name");
  if (companyError) return { status: "error" as const };

  const companies = ((companyRows ?? []) as InvoiceCompany[]).filter((c) => c.status === "active");
  if (companies.length === 0) return { status: "error" as const };

  if (requestedCompanyId) {
    if (!UUID_PATTERN.test(requestedCompanyId) || !companies.some((c) => c.id === requestedCompanyId)) {
      return { status: "denied" as const, companies };
    }
  }

  const selectedCompany = requestedCompanyId
    ? companies.find((c) => c.id === requestedCompanyId)
    : companies.length === 1
      ? companies[0]
      : undefined;
  if (!selectedCompany) return { status: "choose" as const, companies };

  const roleCode = String(membershipRows.find((m) => m.company_id === selectedCompany.id)?.role_code ?? "");

  return {
    status: "ready" as const,
    supabase,
    user,
    companies,
    company: selectedCompany,
    roleCode,
    canRead: canReadInvoices(roleCode),
    canWrite: canWriteInvoices(roleCode),
  };
}
