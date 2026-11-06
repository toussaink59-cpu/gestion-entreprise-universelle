import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceCompanyChooser } from "../company-chooser";
import { abandonInvoiceDraft } from "../actions";
import {
  formatInvoiceCurrency,
  formatInvoiceDate,
  formatInvoiceQuantity,
  invoiceStatusLabel,
} from "../formatting";
import { getInvoiceWorkspace, isInvoiceUuid } from "../workspace";

export const instant = false;

type Props = {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ company?: string; success?: string; action_error?: string }>;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  source_quote_id: string | null;
  status: string;
  billing_kind: string;
  issue_date: string;
  due_date: string | null;
  currency_code: string;
  subject: string | null;
  terms: string | null;
  notes: string | null;
  subtotal_amount: string;
  discount_amount: string;
  total_amount: string;
  abandoned_at: string | null;
  abandon_reason: string | null;
};

type LineRow = {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  discount_type: "none" | "percentage" | "fixed";
  discount_value: string;
  total_amount: string;
};

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const TEXT_LINK =
  "font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function Notice({ title, message, back }: { title: string; message: string; back: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title={title} />
      <p role="alert" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
        {message}
      </p>
      <p className="mt-4 text-sm">
        <Link href="/dashboard/factures" className={TEXT_LINK}>{back}</Link>
      </p>
    </main>
  );
}

export default async function InvoiceDetailPage({ params, searchParams }: Props) {
  await connection();
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Invoices.Detail");
  const [route, query] = await Promise.all([params, searchParams]);
  const back = t("back");
  const workspace = await getInvoiceWorkspace(query.company);

  if (workspace.status === "error") return <Notice title={t("title")} message={t("workspaceError")} back={back} />;
  if (workspace.status === "denied") return <Notice title={t("title")} message={t("companyDenied")} back={back} />;
  if (workspace.status === "choose") {
    return <InvoiceCompanyChooser companies={workspace.companies} destinationPath={"/dashboard/factures/" + route.invoiceId} />;
  }
  if (!workspace.canRead) return <Notice title={t("title")} message={t("readDenied")} back={back} />;
  if (!isInvoiceUuid(route.invoiceId)) return <Notice title={t("notFoundTitle")} message={t("notFound")} back={back} />;

  const { data: invoiceData, error: invoiceError } = await workspace.supabase
    .from("invoices")
    .select(
      "id, customer_id, source_quote_id, status, billing_kind, issue_date, due_date, currency_code, subject, terms, notes, subtotal_amount, discount_amount, total_amount, abandoned_at, abandon_reason",
    )
    .eq("id", route.invoiceId)
    .eq("company_id", workspace.company.id)
    .maybeSingle();

  if (invoiceError) {
    console.error("Invoice detail load failed:", { code: invoiceError.code });
    return <Notice title={t("unavailableTitle")} message={t("loadFailed")} back={back} />;
  }
  if (!invoiceData) return <Notice title={t("notFoundTitle")} message={t("notFound")} back={back} />;
  const invoice = invoiceData as InvoiceRow;

  const [{ data: lineData, error: lineError }, { data: customer }, quoteResult] = await Promise.all([
    workspace.supabase
      .from("invoice_lines")
      .select("id, position, description, quantity, unit_label, unit_price, discount_type, discount_value, total_amount")
      .eq("invoice_id", invoice.id)
      .eq("company_id", workspace.company.id)
      .order("position"),
    workspace.supabase.from("customers").select("name").eq("id", invoice.customer_id).eq("company_id", workspace.company.id).maybeSingle(),
    invoice.source_quote_id
      ? workspace.supabase.from("quotes").select("quote_number").eq("id", invoice.source_quote_id).eq("company_id", workspace.company.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (lineError) console.error("Invoice lines load failed:", { code: lineError.code });
  const lines = (lineData ?? []) as LineRow[];
  const quoteNumber = (quoteResult.data as { quote_number: string | null } | null)?.quote_number ?? null;

  const companyQuery = "?company=" + encodeURIComponent(workspace.company.id);
  const isDraft = invoice.status === "draft";
  const successMessage =
    query.success === "saved" ? t("success.saved") : query.success === "fromQuote" ? t("success.fromQuote") : query.success === "abandoned" ? t("success.abandoned") : null;
  const errorMessage =
    query.action_error === undefined
      ? null
      : query.action_error === "permission" ? t("actionErrors.permission")
      : query.action_error === "invalid" ? t("actionErrors.invalid")
      : query.action_error === "reason" ? t("actionErrors.reason")
      : t("actionErrors.generic");

  function discountLabel(line: LineRow): string {
    if (line.discount_type === "percentage") return formatInvoiceQuantity(line.discount_value, locale) + " %";
    if (line.discount_type === "fixed") return formatInvoiceCurrency(line.discount_value, invoice.currency_code, locale);
    return t("none");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={invoice.subject || t("untitled")}
        description={t("summary", { customer: customer?.name ?? t("customerUnavailable"), status: invoiceStatusLabel(invoice.status, locale) })}
        actions={<Link href={"/dashboard/factures" + companyQuery} className={SECONDARY_BUTTON}>{t("backList")}</Link>}
      />

      {successMessage ? (
        <p role="status" className="mb-5 rounded-md border border-[#D2E2D7] bg-[#EEF5F0] p-4 text-sm text-[#285C45]">{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mb-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">{errorMessage}</p>
      ) : null}

      <p className="mb-6 rounded-md border border-[#EADFC0] bg-[#F8F4EA] p-4 text-sm text-[#76571F]">{t("draftNotice")}</p>

      {!isDraft ? (
        <p className="mb-6 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
          {t("abandonedOn", { date: invoice.abandoned_at ? formatInvoiceDate(invoice.abandoned_at.slice(0, 10), locale) : "—" })}
          {invoice.abandon_reason ? " · " + t("reason") + " : " + invoice.abandon_reason : ""}
        </p>
      ) : null}

      <dl className="mb-8 grid gap-x-8 gap-y-3 border-b border-[var(--pg-border)] pb-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--pg-text-muted)]">{t("issueDate")}</dt>
          <dd className="mt-1 text-[var(--pg-text)]">{formatInvoiceDate(invoice.issue_date, locale)}</dd>
        </div>
        <div>
          <dt className="text-[var(--pg-text-muted)]">{t("dueDate")}</dt>
          <dd className="mt-1 text-[var(--pg-text)]">{invoice.due_date ? formatInvoiceDate(invoice.due_date, locale) : t("noDueDate")}</dd>
        </div>
        <div>
          <dt className="text-[var(--pg-text-muted)]">{t("origin")}</dt>
          <dd className="mt-1 text-[var(--pg-text)]">
            {invoice.source_quote_id ? (
              <Link href={"/dashboard/devis/" + invoice.source_quote_id + companyQuery} className={TEXT_LINK}>
                {t("fromQuote", { quote: quoteNumber ?? t("quoteNoNumber") })}
              </Link>
            ) : (
              t("standalone")
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--pg-text-muted)]">{t("currency")}</dt>
          <dd className="mt-1 text-[var(--pg-text)]">{invoice.currency_code}</dd>
        </div>
      </dl>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-[var(--pg-text)]">{t("linesTitle")}</h2>
        {lineError ? (
          <p role="alert" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">{t("linesFailed")}</p>
        ) : lines.length === 0 ? (
          <p className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">{t("noLines")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">{t("linesCaption")}</caption>
              <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("columns.description")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t("columns.quantity")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("columns.unit")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t("columns.unitPrice")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("columns.discount")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t("columns.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t border-[var(--pg-border)] align-top">
                    <td className="px-4 py-4 text-[var(--pg-text)]">{line.description}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[var(--pg-text)]">{formatInvoiceQuantity(line.quantity, locale)}</td>
                    <td className="px-4 py-4 text-[var(--pg-text)]">{line.unit_label}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[var(--pg-text)]">{formatInvoiceCurrency(line.unit_price, invoice.currency_code, locale)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--pg-text)]">{discountLabel(line)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums text-[var(--pg-text)]">{formatInvoiceCurrency(line.total_amount, invoice.currency_code, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="ml-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-2 border-t border-[var(--pg-border)] pt-4 text-sm">
          <dt className="text-[var(--pg-text-muted)]">{t("subtotal")}</dt>
          <dd className="text-right tabular-nums text-[var(--pg-text)]">{formatInvoiceCurrency(invoice.subtotal_amount, invoice.currency_code, locale)}</dd>
          <dt className="text-[var(--pg-text-muted)]">{t("discounts")}</dt>
          <dd className="text-right tabular-nums text-[var(--pg-text)]">{formatInvoiceCurrency(invoice.discount_amount, invoice.currency_code, locale)}</dd>
          <dt className="text-[var(--pg-text-muted)]">{t("tax")}</dt>
          <dd className="text-right text-[var(--pg-text-muted)]">{t("taxNotConfigured")}</dd>
          <dt className="font-semibold text-[var(--pg-text)]">{t("draftTotal")}</dt>
          <dd className="text-right font-semibold tabular-nums text-[var(--pg-text)]">{formatInvoiceCurrency(invoice.total_amount, invoice.currency_code, locale)}</dd>
        </dl>

        {invoice.terms ? (
          <section className="border-t border-[var(--pg-border)] pt-4">
            <h3 className="font-semibold text-[var(--pg-text)]">{t("terms")}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--pg-text-muted)]">{invoice.terms}</p>
          </section>
        ) : null}
        {invoice.notes ? (
          <section className="border-t border-[var(--pg-border)] pt-4">
            <h3 className="font-semibold text-[var(--pg-text)]">{t("notes")}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--pg-text-muted)]">{invoice.notes}</p>
          </section>
        ) : null}
      </section>

      {isDraft && workspace.canWrite ? (
        <section className="mt-10 border-t border-[var(--pg-border)] pt-6">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">{t("abandonTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--pg-text-muted)]">{t("abandonDescription")}</p>
          <form action={abandonInvoiceDraft} className="mt-4 max-w-xl space-y-3">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <label htmlFor="abandon-reason" className="block text-sm font-medium text-[var(--pg-text)]">{t("abandonReason")}</label>
            <textarea
              id="abandon-reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              rows={3}
              aria-describedby="abandon-help"
              className="block w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            />
            <p id="abandon-help" className="text-xs text-[var(--pg-text-muted)]">{t("abandonHelp")}</p>
            <button type="submit" className={SECONDARY_BUTTON}>{t("abandonButton")}</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
