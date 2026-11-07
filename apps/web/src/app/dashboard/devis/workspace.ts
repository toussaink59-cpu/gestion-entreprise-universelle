import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type QuoteCompany = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  default_currency: string;
  status: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const READ_ROLES = new Set([
  "owner",
  "company_admin",
  "finance",
  "sales_purchasing",
  "auditor",
]);

// invoices:create : rôles autorisés à créer un brouillon de facture depuis un devis accepté
// (create_invoice_draft_from_quote reste l'autorité).
const INVOICE_CREATE_ROLES = new Set(["owner", "company_admin", "finance", "sales_purchasing"]);

const WRITE_ROLES = new Set([
  "owner",
  "company_admin",
  "sales_purchasing",
]);

export function isQuoteUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function getQuoteWorkspace(requestedCompanyId?: string) {
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

  if (membershipError) {
    return {
      status: "error" as const,
      message:
        "Impossible de vérifier les appartenances à l’entreprise. Réessaie plus tard.",
    };
  }

  const membershipRows = memberships ?? [];
  if (membershipRows.length === 0) redirect("/onboarding");

  const companyIds = [
    ...new Set(membershipRows.map((membership) => membership.company_id)),
  ];

  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency, status")
    .in("id", companyIds)
    .order("legal_name");

  if (companyError) {
    return {
      status: "error" as const,
      message: "Impossible de charger les entreprises accessibles.",
    };
  }

  const companies = ((companyRows ?? []) as QuoteCompany[]).filter(
    (company) => company.status === "active",
  );

  if (companies.length === 0) {
    return {
      status: "error" as const,
      message: "Aucune entreprise active n’est accessible pour les devis.",
    };
  }

  if (requestedCompanyId) {
    if (
      !UUID_PATTERN.test(requestedCompanyId) ||
      !companies.some((company) => company.id === requestedCompanyId)
    ) {
      return { status: "denied" as const, companies };
    }
  }

  const selectedCompany =
    requestedCompanyId
      ? companies.find((company) => company.id === requestedCompanyId)
      : companies.length === 1
        ? companies[0]
        : undefined;

  if (!selectedCompany) {
    return { status: "choose" as const, companies };
  }

  const membership = membershipRows.find(
    (item) => item.company_id === selectedCompany.id,
  );
  const roleCode = String(membership?.role_code ?? "");
  const canRead = READ_ROLES.has(roleCode);
  const canWrite = WRITE_ROLES.has(roleCode);
  // Les rôles qui modifient les devis sont aussi ceux qui détiennent quotes:validate ;
  // la fonction SQL send_quote() reste l'autorité.
  const canSend = canWrite;
  // quotes:cancel est réservé au propriétaire et à l'administrateur.
  const canCancel = roleCode === "owner" || roleCode === "company_admin";
  const canInvoice = INVOICE_CREATE_ROLES.has(roleCode);

  return {
    status: "ready" as const,
    supabase,
    user,
    companies,
    company: selectedCompany,
    roleCode,
    canRead,
    canWrite,
    canSend,
    canCancel,
    canInvoice,
  };
}
