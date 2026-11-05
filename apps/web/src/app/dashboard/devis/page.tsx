import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatQuoteCurrency,
  formatQuoteDate,
  quoteStatusLabel,
} from "./formatting";
import { QuoteCompanyChooser } from "./company-chooser";
import { getQuoteWorkspace } from "./workspace";

export const instant = false;

type Props = {
  searchParams: Promise<{
    company?: string;
    q?: string;
    error?: string;
  }>;
};

type QuoteRow = {
  id: string;
  customer_id: string;
  quote_number: string | null;
  status: string;
  issue_date: string;
  valid_until: string;
  currency_code: string;
  total_amount: string;
  subject: string | null;
  updated_at: string;
};

const LINK_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function AccessMessage({ message, title, eyebrow, back }: { message: string; title: string; eyebrow: string; back: string }) {
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

export default async function QuotesPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Quotes.List");
  const workspace = await getQuoteWorkspace(params.company);

  if (workspace.status === "error") {
    return <AccessMessage message={t("workspaceError")} title={t("title")} eyebrow={t("eyebrow")} back={t("accessBack")} />;
  }
  if (workspace.status === "denied") {
    return (
      <AccessMessage message={t("companyDenied")} title={t("title")} eyebrow={t("eyebrow")} back={t("accessBack")} />
    );
  }
  if (workspace.status === "choose") {
    return <QuoteCompanyChooser companies={workspace.companies} />;
  }
  if (!workspace.canRead) {
    return (
      <AccessMessage message={t("readDenied")} title={t("title")} eyebrow={t("eyebrow")} back={t("accessBack")} />
    );
  }

  const search = (params.q ?? "").trim().slice(0, 80);
  let quoteQuery = workspace.supabase
    .from("quotes")
    .select(
      "id, customer_id, quote_number, status, issue_date, valid_until, currency_code, total_amount, subject, updated_at",
    )
    .eq("company_id", workspace.company.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (search) {
    quoteQuery = quoteQuery.ilike("subject", "%" + search + "%");
  }

  const { data: quoteData, error: quoteError } = await quoteQuery;
  if (quoteError) {
    console.error("Quote draft list failed:", { code: quoteError.code });
  }
  const quotes = (quoteData ?? []) as QuoteRow[];

  const customerIds = [...new Set(quotes.map((quote) => quote.customer_id))];
  const customerNames = new Map<string, string>();

  if (customerIds.length > 0) {
    const { data: customers, error: customersError } = await workspace.supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", workspace.company.id)
      .in("id", customerIds);

    if (customersError) {
      console.error("Quote customer labels failed:", {
        code: customersError.code,
      });
    } else {
      for (const customer of customers ?? []) {
        customerNames.set(customer.id, customer.name);
      }
    }
  }

  const companyQuery = "?company=" + encodeURIComponent(workspace.company.id);
  const failure = params.error === "access" ? t("errors.access") : params.error === "invalid" ? t("errors.invalid") : params.error === "save" ? t("errors.save") : params.error === "not-found" ? t("errors.notFound") : null;
  const hasMore = quotes.length === 100;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", { company: workspace.company.trade_name || workspace.company.legal_name })}
        actions={
          <>
            {workspace.canWrite ? (
              <Link
                href={"/dashboard/devis/nouveau" + companyQuery}
                className={LINK_BUTTON}
              >
                {t("newQuote")}
              </Link>
            ) : null}
            {workspace.companies.length > 1 ? (
              <Link
                href="/dashboard/devis"
                className={SECONDARY_BUTTON}
              >
                {t("changeCompany")}
              </Link>
            ) : null}
          </>
        }
      />

      {failure ? (
        <p
          role="alert"
          className="mb-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]"
        >
          {failure}
        </p>
      ) : null}

      {quoteError ? (
        <p
          role="alert"
          className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
        >
          {t("loadFailed")}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--pg-border)] p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--pg-text)]">
              {t("sectionTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
              {t("sectionDescription")}
            </p>
          </div>

          <form
            method="get"
            action="/dashboard/devis"
            className="flex w-full flex-wrap gap-2 sm:w-auto"
          >
            <input
              type="hidden"
              name="company"
              value={workspace.company.id}
            />
            <label
              htmlFor="quote-search"
              className="sr-only"
            >
              {t("searchLabel")}
            </label>
            <input
              id="quote-search"
              className="min-h-11 min-w-48 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
              type="search"
              name="q"
              maxLength={80}
              placeholder={t("searchPlaceholder")}
              defaultValue={search}
            />
            <button type="submit" className={SECONDARY_BUTTON}>
              {t("searchButton")}
            </button>
          </form>
        </div>

        {quotes.length === 0 && !quoteError ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title={t("emptyTitle")}
              description={
                workspace.canWrite
                  ? t("emptyWritable")
                  : t("emptyReadOnly")
              }
              action={
                workspace.canWrite ? (
                  <Link
                    href={"/dashboard/devis/nouveau" + companyQuery}
                    className={LINK_BUTTON}
                  >
                    {t("createDraft")}
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : null}

        {quotes.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{t("columns.reference")}</th>
                    <th className="px-5 py-3 font-semibold">{t("columns.customer")}</th>
                    <th className="px-5 py-3 font-semibold">{t("columns.subject")}</th>
                    <th className="px-5 py-3 font-semibold">{t("columns.date")}</th>
                    <th className="px-5 py-3 font-semibold">{t("columns.validity")}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t("columns.total")}</th>
                    <th className="px-5 py-3 font-semibold">{t("columns.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-t border-[var(--pg-border)] align-top hover:bg-[var(--pg-surface-subtle)]"
                    >
                      <td className="px-5 py-4">
                        <span className="block font-medium text-[var(--pg-text)]">
                          {quote.quote_number ?? t("noNumber")}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--pg-text-muted)]">
                          {quoteStatusLabel(quote.status, locale)}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-[var(--pg-text-muted)]">
                          {t("idPrefix")} {quote.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[var(--pg-text)]">
                        {customerNames.get(quote.customer_id) ?? t("customerUnavailable")}
                      </td>
                      <td className="max-w-64 px-5 py-4 text-[var(--pg-text)]">
                        {quote.subject || t("noSubject")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[var(--pg-text)]">
                        {formatQuoteDate(quote.issue_date, locale)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[var(--pg-text)]">
                        {formatQuoteDate(quote.valid_until, locale)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-[var(--pg-text)]">
                        {formatQuoteCurrency(quote.total_amount, quote.currency_code, locale)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={"/dashboard/devis/" + quote.id + companyQuery}
                          className="inline-flex min-h-11 items-center font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
                        >
                          {t("view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--pg-border)] md:hidden">
              {quotes.map((quote) => (
                <li key={quote.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--pg-text)]">
                        {customerNames.get(quote.customer_id) ?? t("customerUnavailable")}
                      </p>
                      <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
                        {quote.subject || t("noSubject")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[var(--pg-surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--pg-text-muted)]">
                      {quote.quote_number ?? quoteStatusLabel(quote.status, locale)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--pg-text-muted)]">
                      {formatQuoteDate(quote.issue_date, locale)} · ID {quote.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--pg-text)]">
                      {formatQuoteCurrency(quote.total_amount, quote.currency_code, locale)}
                    </span>
                  </div>
                  <Link
                    href={"/dashboard/devis/" + quote.id + companyQuery}
                    className="mt-3 inline-flex min-h-11 items-center font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
                  >
                    {t("viewQuote")}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {hasMore ? (
          <p className="border-t border-[var(--pg-border)] px-5 py-3 text-xs text-[var(--pg-text-muted)]">
            {t("limit")}
          </p>
        ) : null}
      </section>

      <footer className="mt-8 border-t border-[var(--pg-border)] pt-5 text-sm text-[var(--pg-text-muted)]">
        {t("footer")}
      </footer>
    </main>
  );
}
