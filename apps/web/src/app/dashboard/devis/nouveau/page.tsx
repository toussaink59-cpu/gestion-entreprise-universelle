import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteDraftForm } from "../quote-draft-form";
import { QuoteCompanyChooser } from "../company-chooser";
import { getQuoteWorkspace } from "../workspace";
import type { QuoteCustomerOption } from "../types";

export const instant = false;

type Props = {
  searchParams: Promise<{ company?: string }>;
};

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function Message({ title, message, eyebrow, back }: { title: string; message: string; eyebrow: string; back: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader eyebrow={eyebrow} title={title} />
      <p
        role="alert"
        className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
      >
        {message}
      </p>
      <p className="mt-4 text-sm">
        <Link
          href="/dashboard"
          className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline"
        >
          {back}
        </Link>
      </p>
    </main>
  );
}

export default async function NewQuotePage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Quotes.Form");
  const eyebrow = t("eyebrow");
  const title = t("newTitle");
  const back = t("backDashboard");
  const workspace = await getQuoteWorkspace(params.company);

  if (workspace.status === "error") {
    return <Message title={title} eyebrow={eyebrow} back={back} message={t("workspaceError")} />;
  }
  if (workspace.status === "denied") {
    return (
      <Message title={title} eyebrow={eyebrow} back={back} message={t("deniedCompany")} />
    );
  }
  if (workspace.status === "choose") {
    return (
      <QuoteCompanyChooser
        companies={workspace.companies}
        destinationPath="/dashboard/devis/nouveau"
      />
    );
  }
  if (!workspace.canRead) {
    return (
      <Message title={title} eyebrow={eyebrow} back={back} message={t("deniedRead")} />
    );
  }
  if (!workspace.canWrite) {
    return (
      <Message title={title} eyebrow={eyebrow} back={back} message={t("deniedWrite")} />
    );
  }

  const { data: customerData, error: customerError } = await workspace.supabase
    .from("customers")
    .select("id, name, status")
    .eq("company_id", workspace.company.id)
    .order("name")
    .limit(500);

  if (customerError) {
    console.error("Quote customer options failed:", { code: customerError.code });
    return (
      <Message title={title} eyebrow={eyebrow} back={back} message={t("customerLoad")} />
    );
  }

  const customers: QuoteCustomerOption[] = (
    (customerData ?? []) as Array<{
      id: string;
      name: string;
      status: string;
    }>
  )
    .filter((customer) => customer.status === "active")
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      active: true,
    }));

  if (customers.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={t("requiresCustomer")}
          actions={
            <Link
              href={"/dashboard/devis?company=" + encodeURIComponent(workspace.company.id)}
              className={SECONDARY_BUTTON}
            >
              {t("backQuotes")}
            </Link>
          }
        />
        <EmptyState
          title={t("noActiveCustomer")}
          description={t("noActiveCustomerDescription")}
          action={
            <Link
              href={"/dashboard/clients?company=" + encodeURIComponent(workspace.company.id)}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              {t("openCustomers")}
            </Link>
          }
        />
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const validityDate = new Date(today + "T00:00:00.000Z");
  validityDate.setUTCDate(validityDate.getUTCDate() + 30);
  const defaultValidUntil = validityDate.toISOString().slice(0, 10);
  const cancelHref =
    "/dashboard/devis?company=" + encodeURIComponent(workspace.company.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={
          t("createDescription", { company: workspace.company.trade_name || workspace.company.legal_name })
        }
        actions={
          <Link href={cancelHref} className={SECONDARY_BUTTON}>
            {t("backQuotes")}
          </Link>
        }
      />

      <QuoteDraftForm
        companyId={workspace.company.id}
        currencyCode={workspace.company.default_currency}
        customers={customers}
        cancelHref={cancelHref}
        initial={{
          customerId: customers[0].id,
          issueDate: today,
          validUntil: defaultValidUntil,
          subject: "",
          terms: "",
          notes: "",
          lines: [
            {
              description: "",
              quantity: "1",
              unit_label: locale === "en" ? "unit" : "unité",
              unit_price: "0",
              discount_type: "none",
              discount_value: "0",
            },
          ],
        }}
      />
    </main>
  );
}
