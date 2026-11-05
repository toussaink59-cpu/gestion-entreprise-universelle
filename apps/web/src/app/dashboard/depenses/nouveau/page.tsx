import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseCompanyChooser } from "../company-chooser";
import { ExpenseDraftForm } from "../expense-draft-form";
import { todayInTimezone } from "../formatting";
import { getExpenseWorkspace } from "../workspace";

export const instant = false;

type Props = {
  searchParams: Promise<{ company?: string }>;
};

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

export default async function NewExpensePage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const t = await getTranslations("Expenses.Form");
  const eyebrow = t("eyebrow");
  const title = t("newTitle");
  const back = t("backDashboard");
  const message = (value: string) => <Message title={title} message={value} eyebrow={eyebrow} back={back} />;
  const workspace = await getExpenseWorkspace(params.company);

  if (workspace.status === "error") {
    return message(t("workspaceError"));
  }
  if (workspace.status === "denied") {
    return (
      {message(t("companyDenied"))}
    );
  }
  if (workspace.status === "choose") {
    return <ExpenseCompanyChooser companies={workspace.companies} />;
  }
  if (!workspace.canRead) {
    return (
      {message(t("readDenied"))}
    );
  }
  if (!workspace.canCreate) {
    return (
      {message(t("writeDenied"))}
    );
  }

  const { data: supplierData, error: supplierError } = await workspace.supabase
    .from("suppliers")
    .select("id, name, status")
    .eq("company_id", workspace.company.id)
    .order("name")
    .limit(500);

  if (supplierError) {
    console.error("Expense supplier options failed:", { code: supplierError.code });
  }

  const suppliers = supplierError
    ? []
    : ((supplierData ?? []) as Array<{
        id: string;
        name: string;
        status: string;
      }>)
        .filter((supplier) => supplier.status === "active")
        .map(({ id, name }) => ({ id, name }));

  const cancelHref =
    "/dashboard/depenses?company=" + encodeURIComponent(workspace.company.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={
          t("createDescription", { company: workspace.company.trade_name || workspace.company.legal_name })
        }
        actions={
          <Link
            href={cancelHref}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
          >
            {t("backExpenses")}
          </Link>
        }
      />

      <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6">
        {supplierError ? (
          <p role="status" className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-3 text-sm text-[var(--pg-text-muted)]">
            {t("supplierLoad")}
          </p>
        ) : null}
        <ExpenseDraftForm
          companyId={workspace.company.id}
          currencyCode={workspace.company.default_currency}
          suppliers={suppliers}
          expenseDate={todayInTimezone(workspace.company.timezone)}
          cancelHref={cancelHref}
        />
      </section>
    </main>
  );
}
