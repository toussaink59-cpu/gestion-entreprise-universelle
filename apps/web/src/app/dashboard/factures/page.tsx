import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatInvoiceCurrency, formatInvoiceDate, invoiceStatusLabel } from "./formatting";
import { InvoiceCompanyChooser } from "./company-chooser";
import { getInvoiceWorkspace } from "./workspace";

export const instant = false;

type Props = { searchParams: Promise<{ company?: string; q?: string; status?: string }> };

type InvoiceRow = {
  id: string;
  customer_id: string;
  status: string;
  billing_kind: string;
  issue_date: string;
  due_date: string | null;
  currency_code: string;
  total_amount: string;
  subject: string | null;
};

const LINK_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const ROW_LINK =
  "inline-flex min-h-11 items-center font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function AccessMessage({ message, title, back }: { message: string; title: string; back: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={title} />
      <p role="alert" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
        {message}
      </p>
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline">
          {back}
        </Link>
      </p>
    </main>
  );
}

export default async function InvoicesPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Invoices.List");
  const workspace = await getInvoiceWorkspace(params.company);

  if (workspace.status === "error") return <AccessMessage message={t("workspaceError")} title={t("title")} back={t("accessBack")} />;
  if (workspace.status === "denied") return <AccessMessage message={t("companyDenied")} title={t("title")} back={t("accessBack")} />;
  if (workspace.status === "choose") return <InvoiceCompanyChooser companies={workspace.companies} />;
  if (!workspace.canRead) return <AccessMessage message={t("readDenied")} title={t("title")} back={t("accessBack")} />;

  const search = (params.q ?? "").trim().slice(0, 80);
  const statusFilter = params.status === "draft" || params.status === "abandoned_draft" ? params.status : "";

  let query = workspace.supabase
    .from("invoices")
    .select("id, customer_id, status, billing_kind, issue_date, due_date, currency_code, total_amount, subject")
    .eq("company_id", workspace.company.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (search) query = query.ilike("subject", "%" + search.replace(/[%_\\]/g, "\\$&") + "%");

  const { data, error } = await query;
  if (error) console.error("Invoice list failed:", { code: error.code });
  const invoices = (data ?? []) as InvoiceRow[];

  const customerNames = new Map<string, string>();
  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  if (customerIds.length > 0) {
    const { data: customers, error: customersError } = await workspace.supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", workspace.company.id)
      .in("id", customerIds);
    if (customersError) console.error("Invoice customer labels failed:", { code: customersError.code });
    for (const customer of customers ?? []) customerNames.set(customer.id, customer.name);
  }

  const companyQuery = "?company=" + encodeURIComponent(workspace.company.id);
  const customerLabel = (id: string) => customerNames.get(id) ?? t("customerUnavailable");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("description", { company: workspace.company.trade_name || workspace.company.legal_name })}
        actions={
          <>
            {workspace.canWrite ? (
              <Link href={"/dashboard/factures/nouveau" + companyQuery} className={LINK_BUTTON}>
                {t("newInvoice")}
              </Link>
            ) : null}
            {workspace.companies.length > 1 ? (
              <Link href="/dashboard/factures" className={SECONDARY_BUTTON}>
                {t("changeCompany")}
              </Link>
            ) : null}
          </>
        }
      />

      <p className="mb-5 rounded-md border border-[#EADFC0] bg-[#F8F4EA] p-4 text-sm text-[#76571F]">{t("draftOnlyNotice")}</p>

      {error ? (
        <p role="alert" className="mb-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">
          {t("loadFailed")}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--pg-border)] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">{t("sectionTitle")}</h2>
          <form method="get" action="/dashboard/factures" className="flex w-full flex-wrap gap-2 sm:w-auto">
            <input type="hidden" name="company" value={workspace.company.id} />
            <label htmlFor="invoice-status" className="sr-only">{t("statusLabel")}</label>
            <select
              id="invoice-status"
              name="status"
              defaultValue={statusFilter}
              className="min-h-11 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              <option value="">{t("statusAll")}</option>
              <option value="draft">{invoiceStatusLabel("draft", locale)}</option>
              <option value="abandoned_draft">{invoiceStatusLabel("abandoned_draft", locale)}</option>
            </select>
            <label htmlFor="invoice-search" className="sr-only">{t("searchLabel")}</label>
            <input
              id="invoice-search"
              type="search"
              name="q"
              maxLength={80}
              placeholder={t("searchPlaceholder")}
              defaultValue={search}
              className="min-h-11 min-w-48 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            />
            <button type="submit" className={SECONDARY_BUTTON}>{t("filterButton")}</button>
          </form>
        </div>

        {invoices.length === 0 && !error ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title={search || statusFilter ? t("emptyFilteredTitle") : t("emptyTitle")}
              description={search || statusFilter ? t("emptyFilteredDescription") : workspace.canWrite ? t("emptyWritable") : t("emptyReadOnly")}
              action={
                workspace.canWrite && !search && !statusFilter ? (
                  <Link href={"/dashboard/factures/nouveau" + companyQuery} className={LINK_BUTTON}>
                    {t("createDraft")}
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : null}

        {invoices.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <caption className="sr-only">{t("tableCaption")}</caption>
                <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.reference")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.customer")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.subject")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.date")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.dueDate")}</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">{t("columns.total")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[var(--pg-border)] align-top hover:bg-[var(--pg-surface-subtle)]">
                      <td className="px-5 py-4">
                        <span className="block font-medium text-[var(--pg-text)]">{invoiceStatusLabel(invoice.status, locale)}</span>
                        <span className="mt-1 block text-xs text-[var(--pg-text-muted)]">
                          {invoice.billing_kind === "full" ? t("fromQuote") : t("standalone")}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-[var(--pg-text-muted)]">
                          {t("idPrefix")} {invoice.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[var(--pg-text)]">{customerLabel(invoice.customer_id)}</td>
                      <td className="max-w-64 px-5 py-4 text-[var(--pg-text)]">{invoice.subject || t("noSubject")}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[var(--pg-text)]">{formatInvoiceDate(invoice.issue_date, locale)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[var(--pg-text)]">
                        {invoice.due_date ? formatInvoiceDate(invoice.due_date, locale) : t("noDueDate")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-[var(--pg-text)]">
                        {formatInvoiceCurrency(invoice.total_amount, invoice.currency_code, locale)}
                      </td>
                      <td className="px-5 py-4">
                        <Link href={"/dashboard/factures/" + invoice.id + companyQuery} className={ROW_LINK}>
                          {t("view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--pg-border)] md:hidden">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--pg-text)]">{customerLabel(invoice.customer_id)}</p>
                      <p className="mt-1 text-sm text-[var(--pg-text-muted)]">{invoice.subject || t("noSubject")}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[var(--pg-surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--pg-text-muted)]">
                      {invoiceStatusLabel(invoice.status, locale)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--pg-text-muted)]">{formatInvoiceDate(invoice.issue_date, locale)}</span>
                    <span className="font-semibold tabular-nums text-[var(--pg-text)]">
                      {formatInvoiceCurrency(invoice.total_amount, invoice.currency_code, locale)}
                    </span>
                  </div>
                  <Link href={"/dashboard/factures/" + invoice.id + companyQuery} className={"mt-2 " + ROW_LINK}>
                    {t("viewInvoice")}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {invoices.length === 100 ? (
          <p className="border-t border-[var(--pg-border)] px-5 py-3 text-xs text-[var(--pg-text-muted)]">{t("limit")}</p>
        ) : null}
      </section>
    </main>
  );
}
