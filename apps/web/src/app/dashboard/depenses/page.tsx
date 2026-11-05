import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseCompanyChooser } from "./company-chooser";
import { formatExpenseCurrency, formatExpenseDate } from "./formatting";
import { getExpenseWorkspace } from "./workspace";

export const instant = false;

type Props = {
  searchParams: Promise<{
    company?: string;
    success?: string;
  }>;
};

type ExpenseRow = {
  id: string;
  supplier_id: string | null;
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  currency_code: string;
  status: string;
};

const PRIMARY_LINK =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function Message({
  title,
  message,
  eyebrow,
  backDashboard,
}: {
  title: string;
  message: string;
  eyebrow: string;
  backDashboard: string;
}) {
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
          {backDashboard}
        </Link>
      </p>
    </main>
  );
}

export default async function ExpensesPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Expenses.List");
  const tErrors = await getTranslations("Expenses.Errors");
  const workspace = await getExpenseWorkspace(params.company);

  if (workspace.status === "error") {
    return <Message title={t("title")} eyebrow={t("eyebrow")} backDashboard={t("backDashboard")} message={workspace.message} />;
  }
  if (workspace.status === "denied") {
    return (
      <Message
        title={t("title")}
        eyebrow={t("eyebrow")}
        backDashboard={t("backDashboard")}
        message={tErrors("companyNotAccessible")}
      />
    );
  }
  if (workspace.status === "choose") {
    return <ExpenseCompanyChooser companies={workspace.companies} />;
  }
  if (!workspace.canRead) {
    return (
      <Message
        title={t("title")}
        eyebrow={t("eyebrow")}
        backDashboard={t("backDashboard")}
        message={tErrors("readDenied")}
      />
    );
  }

  const { data, error } = await workspace.supabase
    .from("expenses")
    .select(
      "id, supplier_id, expense_date, category, description, amount, currency_code, status",
    )
    .eq("company_id", workspace.company.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Expense list failed:", { code: error.code });
    return (
      <Message
        title={t("title")}
        eyebrow={t("eyebrow")}
        backDashboard={t("backDashboard")}
        message={tErrors("loadFailed")}
      />
    );
  }

  const expenses = (data ?? []) as ExpenseRow[];
  const supplierIds = [
    ...new Set(
      expenses
        .map((expense) => expense.supplier_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const supplierNames = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: suppliers, error: suppliersError } = await workspace.supabase
      .from("suppliers")
      .select("id, name")
      .eq("company_id", workspace.company.id)
      .in("id", supplierIds);

    if (suppliersError) {
      console.error("Expense supplier labels failed:", {
        code: suppliersError.code,
      });
    } else {
      for (const supplier of suppliers ?? []) {
        supplierNames.set(supplier.id, supplier.name);
      }
    }
  }

  const companyQuery = "?company=" + encodeURIComponent(workspace.company.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", { company: workspace.company.trade_name || workspace.company.legal_name })}
        actions={
          <>
            {workspace.canCreate ? (
              <Link href={"/dashboard/depenses/nouveau" + companyQuery} className={PRIMARY_LINK}>
                {t("newExpense")}
              </Link>
            ) : null}
            {workspace.companies.length > 1 ? (
              <Link
                href="/dashboard/depenses"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
              >
                {t("changeCompany")}
              </Link>
            ) : null}
          </>
        }
      />

      {params.success === "saved" ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-5 rounded-md border border-[#CFE0D4] bg-[#EEF5F0] p-4 text-sm text-[#285C45]"
        >
          {t("savedSuccess")}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
        <div className="border-b border-[var(--pg-border)] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            {t("sectionTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            {t("sectionDescription")}
          </p>
        </div>

        {expenses.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title={t("emptyTitle")}
              description={
                workspace.canCreate
                  ? t("emptyCanCreate")
                  : t("emptyReadOnly")
              }
              action={
                workspace.canCreate ? (
                  <Link href={"/dashboard/depenses/nouveau" + companyQuery} className={PRIMARY_LINK}>
                    {t("createDraft")}
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.date")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.categoryDescription")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.supplier")}</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">{t("columns.amount")}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-[var(--pg-border)] align-top hover:bg-[var(--pg-surface-subtle)]">
                      <td className="whitespace-nowrap px-5 py-4 text-[var(--pg-text-muted)]">
                        {formatExpenseDate(expense.expense_date, locale)}
                      </td>
                      <td className="max-w-md px-5 py-4">
                        <span className="block font-medium text-[var(--pg-text)]">{expense.category}</span>
                        <span className="mt-1 block break-words text-[var(--pg-text-muted)]">{expense.description}</span>
                      </td>
                      <td className="px-5 py-4 text-[var(--pg-text-muted)]">
                        {expense.supplier_id ? supplierNames.get(expense.supplier_id) ?? t("supplierUnavailable") : t("notSpecified")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-[var(--pg-text)]">
                        {formatExpenseCurrency(expense.amount, expense.currency_code, locale)}
                      </td>
                      <td className="px-5 py-4 text-[var(--pg-text-muted)]">{t("draft")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--pg-border)] md:hidden">
              {expenses.map((expense) => (
                <li key={expense.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--pg-text)]">{expense.category}</p>
                      <p className="mt-1 break-words text-sm text-[var(--pg-text-muted)]">{expense.description}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--pg-text)]">
                      {formatExpenseCurrency(expense.amount, expense.currency_code, locale)}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--pg-text-muted)]">
                    {formatExpenseDate(expense.expense_date, locale)}
                    {" · "}
                    {expense.supplier_id ? supplierNames.get(expense.supplier_id) ?? t("supplierUnavailable") : t("supplierNotSpecified")}
                    {" · " + t("draft")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {expenses.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--pg-text-muted)]">
          {t("showingLimit")}
        </p>
      ) : null}
    </main>
  );
}
