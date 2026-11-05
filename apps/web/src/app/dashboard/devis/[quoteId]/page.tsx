import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteDraftForm } from "../quote-draft-form";
import {
  formatQuoteCurrency,
  formatQuoteDate,
  formatQuoteQuantity,
  quoteStatusLabel,
} from "../formatting";
import { cancelQuote, recordQuoteResponse, sendQuote } from "../actions";
import {
  QUOTE_RESPONSE_METHODS,
} from "@/lib/security/quote-response-validation";
import { QuoteCompanyChooser } from "../company-chooser";
import { getQuoteWorkspace, isQuoteUuid } from "../workspace";
import type {
  QuoteCustomerOption,
  QuoteDraftInitialValues,
} from "../types";

export const instant = false;

type Props = {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{
    company?: string;
    success?: string;
    send_error?: string;
    action_error?: string;
  }>;
};

type QuoteRecord = {
  id: string;
  company_id: string;
  customer_id: string;
  quote_number: string | null;
  status: string;
  issue_date: string;
  valid_until: string;
  currency_code: string;
  subject: string | null;
  terms: string | null;
  notes: string | null;
  subtotal_amount: string;
  discount_amount: string;
  total_amount: string;
  accepted_at: string | null;
  acceptance_method: string | null;
  acceptance_reference: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

type QuoteLineRecord = {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  discount_type: "none" | "percentage" | "fixed";
  discount_value: string;
  base_amount: string;
  discount_amount: string;
  total_amount: string;
};

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function Notice({ title, message, eyebrow, back }: { title: string; message: string; eyebrow: string; back: string }) {
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
          href="/dashboard/devis"
          className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline"
        >
          {back}
        </Link>
      </p>
    </main>
  );
}

function discountLabel(
  type: QuoteLineRecord["discount_type"],
  value: string,
  currencyCode: string,
  locale: "fr" | "en",
  noneLabel: string,
): string {
  if (type === "percentage") {
    return formatQuoteQuantity(value, locale) + " %";
  }
  if (type === "fixed") {
    return formatQuoteCurrency(value, currencyCode, locale);
  }
  return noneLabel;
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: Props) {
  await connection();
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Quotes.Detail");
  const eyebrow = t("eyebrow");
  const back = t("back");
  const methodLabels = { email: t("methods.email"), whatsapp: t("methods.whatsapp"), phone: t("methods.phone"), signed_document: t("methods.signed_document"), in_person: t("methods.in_person"), other: t("methods.other") };
  const [routeParams, queryParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const workspace = await getQuoteWorkspace(queryParams.company);

  if (workspace.status === "error") {
    return <Notice title={t("title")} message={t("workspaceError")} eyebrow={eyebrow} back={back} />;
  }
  if (workspace.status === "denied") {
    return (
      <Notice title={t("title")} message={t("companyDenied")} eyebrow={eyebrow} back={back} />
    );
  }
  if (workspace.status === "choose") {
    return (
      <QuoteCompanyChooser
        companies={workspace.companies}
        destinationPath={"/dashboard/devis/" + routeParams.quoteId}
      />
    );
  }
  if (!workspace.canRead) {
    return (
      <Notice title={t("title")} message={t("readDenied")} eyebrow={eyebrow} back={back} />
    );
  }
  if (!isQuoteUuid(routeParams.quoteId)) {
    return (
      <Notice title={t("notFoundTitle")} message={t("notFound")} eyebrow={eyebrow} back={back} />
    );
  }

  const { data: quoteData, error: quoteError } = await workspace.supabase
    .from("quotes")
    .select(
      "id, company_id, customer_id, quote_number, status, issue_date, valid_until, currency_code, subject, terms, notes, subtotal_amount, discount_amount, total_amount, accepted_at, acceptance_method, acceptance_reference, rejected_at, cancelled_at, cancellation_reason",
    )
    .eq("id", routeParams.quoteId)
    .eq("company_id", workspace.company.id)
    .maybeSingle();

  if (quoteError) {
    console.error("Quote detail load failed:", { code: quoteError.code });
    return (
      <Notice title={t("unavailableTitle")} message={t("loadFailed")} eyebrow={eyebrow} back={back} />
    );
  }
  if (!quoteData) {
    return (
      <Notice title={t("notFoundTitle")} message={t("notFound")} eyebrow={eyebrow} back={back} />
    );
  }

  const quote = quoteData as QuoteRecord;
  const { data: lineData, error: lineError } = await workspace.supabase
    .from("quote_lines")
    .select(
      "id, position, description, quantity, unit_label, unit_price, discount_type, discount_value, base_amount, discount_amount, total_amount",
    )
    .eq("company_id", workspace.company.id)
    .eq("quote_id", quote.id)
    .order("position");

  if (lineError) {
    console.error("Quote line detail load failed:", { code: lineError.code });
    return (
      <Notice title={t("linesUnavailableTitle")} message={t("linesLoadFailed")} eyebrow={eyebrow} back={back} />
    );
  }

  const lines = (lineData ?? []) as QuoteLineRecord[];
  const { data: customerData, error: customerError } = await workspace.supabase
    .from("customers")
    .select("id, name, status")
    .eq("company_id", workspace.company.id)
    .order("name")
    .limit(500);

  if (customerError) {
    console.error("Quote customer detail failed:", {
      code: customerError.code,
    });
  }

  const allCustomers = (customerData ?? []) as Array<{
    id: string;
    name: string;
    status: string;
  }>;
  const selectedCustomer = allCustomers.find(
    (customer) => customer.id === quote.customer_id,
  );
  const customerName = selectedCustomer?.name ?? t("customerUnavailable");
  const customers: QuoteCustomerOption[] = allCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    active: customer.status === "active",
  }));

  if (
    workspace.canWrite &&
    quote.status === "draft" &&
    selectedCustomer === undefined
  ) {
    const { data: currentCustomer } = await workspace.supabase
      .from("customers")
      .select("id, name, status")
      .eq("company_id", workspace.company.id)
      .eq("id", quote.customer_id)
      .maybeSingle();

    if (currentCustomer) {
      customers.push({
        id: currentCustomer.id,
        name: currentCustomer.name,
        active: currentCustomer.status === "active",
      });
    }
  }

  const companyQuery =
    "?company=" + encodeURIComponent(workspace.company.id);
  const successMessage =
    queryParams.success === "saved" ? t("success.saved") : queryParams.success === "sent" ? t("success.sent") : queryParams.success === "accepted" ? t("success.accepted") : queryParams.success === "rejected" ? t("success.rejected") : queryParams.success === "cancelled" ? t("success.cancelled") : null;
  const actionErrorMessage = (() => {
    switch (queryParams.action_error) {
      case "permission":
        return t("actionErrors.permission");
      case "state":
        return t("actionErrors.state");
      case "invalid":
        return t("actionErrors.invalid");
      case "reason":
        return t("actionErrors.reason");
      case undefined:
        return null;
      default:
        return t("actionErrors.generic");
    }
  })();
  const sendErrorMessage = (() => {
    switch (queryParams.send_error) {
      case "permission":
        return t("sendErrors.permission");
      case "not-draft":
        return t("sendErrors.notDraft");
      case "invalid":
        return t("sendErrors.invalid");
      case undefined:
        return null;
      default:
        return t("sendErrors.generic");
    }
  })();
  const isDraft = quote.status === "draft";

  const initial: QuoteDraftInitialValues = {
    quoteId: quote.id,
    customerId: quote.customer_id,
    issueDate: quote.issue_date,
    validUntil: quote.valid_until,
    subject: quote.subject ?? "",
    terms: quote.terms ?? "",
    notes: quote.notes ?? "",
    lines: lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unit_label,
      unit_price: line.unit_price,
      discount_type: line.discount_type,
      discount_value: line.discount_value,
    })),
  };

  const cancelHref = "/dashboard/devis" + companyQuery;
  const canEditDraft = workspace.canWrite && quote.status === "draft";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={eyebrow}
        title={isDraft ? t("draftTitle") : t("quoteTitle", { number: quote.quote_number ?? "" })}
        description={
          (workspace.company.trade_name || workspace.company.legal_name) +
          " · " + t("internalId") + " " +
          quote.id.slice(0, 8).toUpperCase() +
          (isDraft
            ? " · " + t("noNumber")
            : " · " + quoteStatusLabel(quote.status, locale) + ".")
        }
        actions={
          <Link href={cancelHref} className={SECONDARY_BUTTON}>
            {t("back")}
          </Link>
        }
      />

      {successMessage ? (
        <p
          role="status"
          className="mb-5 rounded-md border border-[#D2E2D7] bg-[#EEF5F0] p-4 text-sm text-[#285C45]"
        >
          {successMessage}
        </p>
      ) : null}

      <section className="mb-7 border-y border-[var(--pg-border)] py-5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              {t("customer")}
            </p>
            <p className="mt-1 font-semibold text-[var(--pg-text)]">
              {customerName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              {t("issueDate")}
            </p>
            <p className="mt-1 font-medium text-[var(--pg-text)]">
              {formatQuoteDate(quote.issue_date, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              {t("validUntil")}
            </p>
            <p className="mt-1 font-medium text-[var(--pg-text)]">
              {formatQuoteDate(quote.valid_until, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              {isDraft ? t("draftTotal") : t("total")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--pg-text)]">
              {formatQuoteCurrency(quote.total_amount, quote.currency_code, locale)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--pg-text-muted)]">
          {isDraft
            ? t("draftNotice")
            : t("sentNotice")}
        </p>
      </section>

      {actionErrorMessage ? (
        <p
          role="alert"
          className="mb-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]"
        >
          {actionErrorMessage}
        </p>
      ) : null}

      {quote.status === "accepted" ? (
        <p className="mb-5 rounded-md border border-[#D2E2D7] bg-[#EEF5F0] p-4 text-sm text-[#285C45]">
          {t("acceptedOn", { date: quote.accepted_at ? formatQuoteDate(quote.accepted_at.slice(0, 10), locale) : "—" })}
          {quote.acceptance_method && quote.acceptance_method in methodLabels
            ? " · " + methodLabels[quote.acceptance_method as keyof typeof methodLabels]
            : ""}
          {quote.acceptance_reference ? " · " + t("proof") + ": " + quote.acceptance_reference : ""}
        </p>
      ) : null}

      {quote.status === "rejected" ? (
        <p className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
          {t("rejectedOn", { date: quote.rejected_at ? formatQuoteDate(quote.rejected_at.slice(0, 10), locale) : "—" })}
        </p>
      ) : null}

      {quote.status === "cancelled" ? (
        <p className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
          {t("cancelledOn", { date: quote.cancelled_at ? formatQuoteDate(quote.cancelled_at.slice(0, 10), locale) : "—" })}
          {quote.cancellation_reason ? " · " + t("reason") + ": " + quote.cancellation_reason : ""}
        </p>
      ) : null}

      {quote.status === "sent" && workspace.canSend ? (
        <section className="mb-7 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            {t("responseTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            {t("responseDescription")}
          </p>
          <form action={recordQuoteResponse} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="quote_id" value={quote.id} />
            <div>
              <label htmlFor="decision" className="block text-sm font-medium text-[var(--pg-text)]">
                {t("decision")}
              </label>
              <select
                id="decision"
                name="decision"
                required
                defaultValue=""
                className="mt-1 min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)]"
              >
                <option value="" disabled>{t("choose")}</option>
                <option value="accepted">{t("accepted")}</option>
                <option value="rejected">{t("rejected")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="method" className="block text-sm font-medium text-[var(--pg-text)]">
                {t("method")}
              </label>
              <select
                id="method"
                name="method"
                defaultValue=""
                className="mt-1 min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)]"
              >
                <option value="">—</option>
                {QUOTE_RESPONSE_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {methodLabels[method]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reference" className="block text-sm font-medium text-[var(--pg-text)]">
                {t("reference")}
              </label>
              <input
                id="reference"
                name="reference"
                type="text"
                maxLength={200}
                className="mt-1 min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
              >
                {t("saveResponse")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {quote.status === "sent" && workspace.canCancel ? (
        <section className="mb-7 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            {t("cancelTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            {t("cancelDescription")}
          </p>
          <form action={cancelQuote} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="quote_id" value={quote.id} />
            <div className="min-w-64 flex-1">
              <label htmlFor="cancellation_reason" className="block text-sm font-medium text-[var(--pg-text)]">
                {t("cancelReason")}
              </label>
              <input
                id="cancellation_reason"
                name="cancellation_reason"
                type="text"
                required
                minLength={3}
                maxLength={500}
                className="mt-1 min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-4 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              {t("confirmCancel")}
            </button>
          </form>
        </section>
      ) : null}

      {sendErrorMessage ? (
        <p
          role="alert"
          className="mb-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]"
        >
          {sendErrorMessage}
        </p>
      ) : null}

      {isDraft && workspace.canSend ? (
        <section className="mb-7 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            {t("sendTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            {t("sendDescription")}
          </p>
          <form action={sendQuote} className="mt-4">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="quote_id" value={quote.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              {t("sendButton")}
            </button>
          </form>
        </section>
      ) : null}

      {canEditDraft && customerError ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
        >
          {t("customerLoadFailed")}
        </p>
      ) : null}

      {canEditDraft && !customerError ? (
        <>
          {customers.filter((customer) => customer.active).length === 0 ? (
            <p
              role="status"
              className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
            >
              {t("noActiveCustomer")}
            </p>
          ) : null}
          <QuoteDraftForm
            companyId={workspace.company.id}
            currencyCode={workspace.company.default_currency}
            customers={customers}
            initial={initial}
            cancelHref={cancelHref}
          />
        </>
      ) : (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--pg-text)]">
              {t("linesTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
              {t("readOnly")}
            </p>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
              {t("noLines")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t("columns.description")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.quantity")}</th>
                    <th className="px-4 py-3 font-semibold">{t("columns.unit")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.unitPrice")}</th>
                    <th className="px-4 py-3 font-semibold">{t("columns.discount")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.lineTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-t border-[var(--pg-border)] align-top"
                    >
                      <td className="px-4 py-4 text-[var(--pg-text)]">
                        {line.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[var(--pg-text)]">
                        {formatQuoteQuantity(line.quantity, locale)}
                      </td>
                      <td className="px-4 py-4 text-[var(--pg-text)]">
                        {line.unit_label}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[var(--pg-text)]">
                        {formatQuoteCurrency(line.unit_price, quote.currency_code, locale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[var(--pg-text)]">
                        {discountLabel(
                          line.discount_type,
                          line.discount_value,
                          quote.currency_code,
                          locale,
                          t("none"),
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums text-[var(--pg-text)]">
                        {formatQuoteCurrency(line.total_amount, quote.currency_code, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <dl className="ml-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-2 border-t border-[var(--pg-border)] pt-4 text-sm">
            <dt className="text-[var(--pg-text-muted)]">{t("subtotal")}</dt>
            <dd className="text-right tabular-nums text-[var(--pg-text)]">
              {formatQuoteCurrency(quote.subtotal_amount, quote.currency_code, locale)}
            </dd>
            <dt className="text-[var(--pg-text-muted)]">{t("discounts")}</dt>
            <dd className="text-right tabular-nums text-[var(--pg-text)]">
              {formatQuoteCurrency(quote.discount_amount, quote.currency_code, locale)}
            </dd>
            <dt className="font-semibold text-[var(--pg-text)]">
              {isDraft ? "Total du brouillon" : "Total"}
            </dt>
            <dd className="text-right font-semibold tabular-nums text-[var(--pg-text)]">
              {formatQuoteCurrency(quote.total_amount, quote.currency_code, locale)}
            </dd>
          </dl>

          {quote.terms ? (
            <section className="border-t border-[var(--pg-border)] pt-4">
              <h3 className="font-semibold text-[var(--pg-text)]">
                {t("terms")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--pg-text-muted)]">
                {quote.terms}
              </p>
            </section>
          ) : null}

          {quote.notes ? (
            <section className="border-t border-[var(--pg-border)] pt-4">
              <h3 className="font-semibold text-[var(--pg-text)]">
                {t("notes")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--pg-text-muted)]">
                {quote.notes}
              </p>
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}
