import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { isInvoiceModuleEnabled } from "@/lib/features";

export const instant = false;

// Rôles pouvant consulter devis, factures et dépenses (miroir de la matrice ; la RLS reste l'autorité).
const BUSINESS_READ_ROLES = new Set(["owner", "company_admin", "finance", "sales_purchasing", "auditor"]);
const MEMBER_ADMIN_ROLES = new Set(["owner", "company_admin"]);

type ContactPreview = { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null };
type Tally = { count: number | null };

const PRIMARY_LINK =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-4 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const TEXT_LINK =
  "inline-flex min-h-11 items-center font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard.Home");
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PageHeader title={t("title")} description={t("loadingDescription")} />
          <div role="status" aria-label={t("loadingLabel")} className="space-y-4">
            <div className="h-24 animate-pulse rounded-lg bg-[var(--pg-surface-subtle)] motion-reduce:animate-none" />
            <div className="h-40 animate-pulse rounded-lg bg-[var(--pg-surface-subtle)] motion-reduce:animate-none" />
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const t = await getTranslations("Dashboard.Home");
  const invoicesEnabled = isInvoiceModuleEnabled();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id, role_code")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    console.error("Dashboard memberships failed:", { code: membershipError.code });
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <PageHeader title={t("title")} />
        <p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">
          {t("membershipError")} {t("membershipErrorHelp")}
        </p>
        <form action={signOut} className="mt-6">
          <button className={SECONDARY_BUTTON} type="submit">{t("signOut")}</button>
        </form>
      </main>
    );
  }

  const companyIds = [...new Set((memberships ?? []).map((membership) => membership.company_id))];
  if (companyIds.length === 0) redirect("/onboarding");

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency")
    .in("id", companyIds)
    .order("legal_name");

  const overviews =
    !companiesError && companies?.length
      ? await Promise.all(
          companies.map(async (company) => {
            const role = String((memberships ?? []).find((item) => item.company_id === company.id)?.role_code ?? "");
            const canReadBusiness = BUSINESS_READ_ROLES.has(role);
            const countOf = async (table: string, status: string): Promise<Tally> => {
              const { count, error } = await supabase
                .from(table)
                .select("id", { count: "exact", head: true })
                .eq("company_id", company.id)
                .eq("status", status);
              if (error) {
                console.error("Dashboard count failed:", { table, code: error.code });
                return { count: null };
              }
              return { count: count ?? 0 };
            };
            const previews = async (table: "customers" | "suppliers") => {
              const { data, error } = await supabase
                .from(table)
                .select("id, name, contact_name, email, phone")
                .eq("company_id", company.id)
                .eq("status", "active")
                .order("updated_at", { ascending: false })
                .limit(5);
              if (error) console.error("Dashboard preview failed:", { table, code: error.code });
              return { rows: (data ?? []) as ContactPreview[], failed: Boolean(error) };
            };
            const [quotesSent, quotesDraft, invoicesDraft, expensesDraft, customers, suppliers] = await Promise.all([
              canReadBusiness ? countOf("quotes", "sent") : Promise.resolve(null),
              canReadBusiness ? countOf("quotes", "draft") : Promise.resolve(null),
              invoicesEnabled && canReadBusiness ? countOf("invoices", "draft") : Promise.resolve(null),
              canReadBusiness ? countOf("expenses", "draft") : Promise.resolve(null),
              previews("customers"),
              previews("suppliers"),
            ]);
            return {
              company,
              canReadBusiness,
              canManageMembers: MEMBER_ADMIN_ROLES.has(role),
              work: [
                { key: "quotesSent", tally: quotesSent, href: "/dashboard/devis" },
                { key: "quotesDraft", tally: quotesDraft, href: "/dashboard/devis" },
                ...(invoicesEnabled
                  ? [{ key: "invoicesDraft" as const, tally: invoicesDraft, href: "/dashboard/factures" }]
                  : []),
                { key: "expensesDraft", tally: expensesDraft, href: "/dashboard/depenses" },
              ],
              customers,
              suppliers,
            };
          }),
        )
      : [];

  const fullName = user.user_metadata?.full_name ? String(user.user_metadata.full_name) : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={(fullName ? t("welcomeNamed", { name: fullName }) : t("welcome")) + " " + t("account", { email: user.email ?? t("emailUnavailable") })}
        actions={
          <>
            <Link href="/dashboard/entreprises/nouvelle" className={PRIMARY_LINK}>{t("createCompany")}</Link>
            <form action={signOut}>
              <button className={SECONDARY_BUTTON} type="submit">{t("signOut")}</button>
            </form>
          </>
        }
      />

      {companiesError ? (
        <p role="alert" className="mb-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">{t("companiesError")}</p>
      ) : null}

      {!companiesError && companies && companies.length === 0 ? (
        <EmptyState
          title={t("noCompaniesTitle")}
          description={t("noCompaniesDescription")}
          action={<Link href="/dashboard/entreprises/nouvelle" className={PRIMARY_LINK}>{t("createCompany")}</Link>}
        />
      ) : null}

      <div className="space-y-12">
        {overviews.map(({ company, canReadBusiness, canManageMembers, work, customers, suppliers }) => {
          const query = "?company=" + encodeURIComponent(company.id);
          const headingId = "company-" + company.id;
          return (
            <section key={company.id} aria-labelledby={headingId} className="border-t border-[var(--pg-border)] pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={headingId} className="text-xl font-semibold text-[var(--pg-text)]">
                    {company.trade_name || company.legal_name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
                    {t("legalName", { name: company.legal_name })} · {t("currency", { currency: company.default_currency })}
                  </p>
                </div>
                {canManageMembers ? (
                  <Link href={"/dashboard/membres" + query} className={SECONDARY_BUTTON}>{t("manageMembers")}</Link>
                ) : null}
              </div>

              {canReadBusiness ? (
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-[var(--pg-text)]">{t("workTitle")}</h3>
                  <ul className="mt-2 divide-y divide-[var(--pg-border)] border-y border-[var(--pg-border)]">
                    {work.map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href + query}
                          className="flex min-h-11 items-center justify-between gap-4 px-1 py-2 text-sm text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pg-focus)]"
                        >
                          <span>{t("work." + item.key)}</span>
                          <span className="font-semibold tabular-nums">
                            {item.tally && item.tally.count !== null ? item.tally.count : <span className="font-normal text-[var(--pg-text-muted)]">{t("countUnavailable")}</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <DirectoryPreview
                  title={t("customerDirectory")}
                  rows={customers.rows}
                  failed={customers.failed}
                  empty={t("customerEmpty")}
                  failedLabel={t("previewError")}
                  open={t("openCustomers")}
                  href={"/dashboard/clients" + query}
                  note={t("recentCount", { count: 5 })}
                />
                <DirectoryPreview
                  title={t("supplierDirectory")}
                  rows={suppliers.rows}
                  failed={suppliers.failed}
                  empty={t("supplierEmpty")}
                  failedLabel={t("previewError")}
                  open={t("openSuppliers")}
                  href={"/dashboard/fournisseurs" + query}
                  note={t("recentCount", { count: 5 })}
                />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function DirectoryPreview({
  title, rows, failed, empty, failedLabel, open, href, note,
}: {
  title: string; rows: ContactPreview[]; failed: boolean; empty: string; failedLabel: string; open: string; href: string; note: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--pg-text)]">{title}</h3>
        <span className="text-xs text-[var(--pg-text-muted)]">{note}</span>
      </div>
      {failed ? (
        <p role="alert" className="mt-3 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-3 text-sm text-[#963F3F]">{failedLabel}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--pg-text-muted)]">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--pg-border)] border-y border-[var(--pg-border)]">
          {rows.map((row) => (
            <li key={row.id} className="py-3">
              <p className="truncate text-sm font-medium text-[var(--pg-text)]">{row.name}</p>
              {row.contact_name ? <p className="mt-0.5 truncate text-xs text-[var(--pg-text-muted)]">{row.contact_name}</p> : null}
              {row.email || row.phone ? (
                <p className="mt-0.5 truncate text-xs text-[var(--pg-text-muted)]">{[row.email, row.phone].filter(Boolean).join(" · ")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Link href={href} className={TEXT_LINK}>{open}</Link>
    </div>
  );
}
