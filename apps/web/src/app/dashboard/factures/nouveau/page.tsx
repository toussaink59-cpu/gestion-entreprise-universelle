import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceCompanyChooser } from "../company-chooser";
import { getInvoiceWorkspace } from "../workspace";
import { InvoiceDraftForm } from "../invoice-draft-form";
import type { InvoiceCustomerOption } from "../types";

export const instant = false;

type Props = { searchParams: Promise<{ company?: string }> };

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function Message({ title, message, back }: { title: string; message: string; back: string }) {
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

export default async function NewInvoicePage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Invoices.Form");
  const title = t("newTitle");
  const back = t("backDashboard");
  const workspace = await getInvoiceWorkspace(params.company);

  if (workspace.status === "error") return <Message title={title} back={back} message={t("workspaceError")} />;
  if (workspace.status === "denied") return <Message title={title} back={back} message={t("deniedCompany")} />;
  if (workspace.status === "choose") {
    return <InvoiceCompanyChooser companies={workspace.companies} destinationPath="/dashboard/factures/nouveau" />;
  }
  if (!workspace.canRead) return <Message title={title} back={back} message={t("deniedRead")} />;
  if (!workspace.canWrite) return <Message title={title} back={back} message={t("deniedWrite")} />;

  const { data, error } = await workspace.supabase
    .from("customers")
    .select("id, name, status")
    .eq("company_id", workspace.company.id)
    .order("name")
    .limit(500);

  if (error) {
    console.error("Invoice customer options failed:", { code: error.code });
    return <Message title={title} back={back} message={t("customerLoad")} />;
  }

  const customers: InvoiceCustomerOption[] = ((data ?? []) as Array<{ id: string; name: string; status: string }>)
    .filter((customer) => customer.status === "active")
    .map((customer) => ({ id: customer.id, name: customer.name }));

  const companyQuery = "?company=" + encodeURIComponent(workspace.company.id);
  const cancelHref = "/dashboard/factures" + companyQuery;

  if (customers.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title={title}
          description={t("requiresCustomer")}
          actions={<Link href={cancelHref} className={SECONDARY_BUTTON}>{t("backInvoices")}</Link>}
        />
        <EmptyState
          title={t("noActiveCustomer")}
          description={t("noActiveCustomerDescription")}
          action={
            <Link
              href={"/dashboard/clients" + companyQuery}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              {t("openCustomers")}
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={title}
        description={t("createDescription", { company: workspace.company.trade_name || workspace.company.legal_name })}
        actions={<Link href={cancelHref} className={SECONDARY_BUTTON}>{t("backInvoices")}</Link>}
      />
      <InvoiceDraftForm
        companyId={workspace.company.id}
        currencyCode={workspace.company.default_currency}
        customers={customers}
        cancelHref={cancelHref}
        defaultUnit={locale === "en" ? "unit" : "unité"}
        today={new Date().toISOString().slice(0, 10)}
      />
    </main>
  );
}
