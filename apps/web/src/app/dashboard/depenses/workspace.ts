import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type ExpenseCompany = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  default_currency: string;
  timezone: string;
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

const CREATE_ROLES = new Set([
  "owner",
  "company_admin",
  "finance",
  "sales_purchasing",
]);

const UPDATE_ROLES = new Set(["owner", "company_admin", "finance"]);

export async function getExpenseWorkspace(requestedCompanyId?: string) {
  const t = await getTranslations("Expenses.Errors");
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
        t("membershipAccess"),
    };
  }

  const membershipRows = memberships ?? [];
  if (membershipRows.length === 0) redirect("/onboarding");

  const companyIds = [
    ...new Set(membershipRows.map((membership) => membership.company_id)),
  ];

  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency, timezone, status")
    .in("id", companyIds)
    .order("legal_name");

  if (companyError) {
    return {
      status: "error" as const,
      message: t("companies"),
    };
  }

  const companies = ((companyRows ?? []) as ExpenseCompany[]).filter(
    (company) => company.status === "active",
  );

  if (companies.length === 0) {
    return {
      status: "error" as const,
      message: t("noActiveCompanies"),
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

  const company = requestedCompanyId
    ? companies.find((item) => item.id === requestedCompanyId)
    : companies.length === 1
      ? companies[0]
      : undefined;

  if (!company) return { status: "choose" as const, companies };

  const membership = membershipRows.find(
    (item) => item.company_id === company.id,
  );
  const roleCode = String(membership?.role_code ?? "");

  return {
    status: "ready" as const,
    supabase,
    user,
    companies,
    company,
    roleCode,
    canRead: READ_ROLES.has(roleCode),
    canCreate: CREATE_ROLES.has(roleCode),
    canUpdate: UPDATE_ROLES.has(roleCode),
  };
}
