import Link from "next/link";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
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
  QUOTE_RESPONSE_METHOD_LABELS,
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

function Notice({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader eyebrow="PolyGest · Commercial" title={title} />
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
          Retour aux devis
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
): string {
  if (type === "percentage") {
    return formatQuoteQuantity(value, locale) + " %";
  }
  if (type === "fixed") {
    return formatQuoteCurrency(value, currencyCode, locale);
  }
  return "Aucune";
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: Props) {
  await connection();
  const locale = (await getLocale()) as "fr" | "en";
  const [routeParams, queryParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const workspace = await getQuoteWorkspace(queryParams.company);

  if (workspace.status === "error") {
    return <Notice title="Devis" message={workspace.message} />;
  }
  if (workspace.status === "denied") {
    return (
      <Notice
        title="Devis"
        message="Cette entreprise n’est pas accessible avec ton compte."
      />
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
      <Notice
        title="Devis"
        message="Ton rôle ne permet pas de consulter les devis de cette entreprise."
      />
    );
  }
  if (!isQuoteUuid(routeParams.quoteId)) {
    return (
      <Notice
        title="Devis introuvable"
        message="Ce brouillon n’est pas accessible dans l’entreprise sélectionnée."
      />
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
      <Notice
        title="Devis indisponible"
        message="Impossible de charger ce brouillon. Vérifie tes permissions et réessaie."
      />
    );
  }
  if (!quoteData) {
    return (
      <Notice
        title="Devis introuvable"
        message="Ce brouillon n’est pas accessible dans l’entreprise sélectionnée."
      />
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
      <Notice
        title="Lignes indisponibles"
        message="Les informations des lignes de ce brouillon ne peuvent pas être chargées."
      />
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
  const customerName = selectedCustomer?.name ?? "Client non consultable";
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
    queryParams.success === "saved"
      ? "Le brouillon a été enregistré."
      : queryParams.success === "sent"
        ? "Le devis a été transmis et numéroté. Il n’est plus modifiable."
        : queryParams.success === "accepted"
          ? "L’acceptation du client est enregistrée."
          : queryParams.success === "rejected"
            ? "Le refus du client est enregistré."
            : queryParams.success === "cancelled"
              ? "Le devis est annulé."
              : null;
  const actionErrorMessage = (() => {
    switch (queryParams.action_error) {
      case "permission":
        return "Ton rôle ne permet pas cette opération.";
      case "state":
        return "L’état du devis a changé : recharge la page.";
      case "invalid":
        return "Vérifie la méthode et la référence de preuve (obligatoires pour une acceptation), et que le devis n’est pas expiré.";
      case "reason":
        return "Indique un motif d’annulation de 3 à 500 caractères.";
      case undefined:
        return null;
      default:
        return "L’opération a échoué. Réessaie, ou contacte l’administrateur si le problème continue.";
    }
  })();
  const sendErrorMessage = (() => {
    switch (queryParams.send_error) {
      case "permission":
        return "Ton rôle ne permet pas de transmettre ce devis.";
      case "not-draft":
        return "Ce devis a déjà été transmis.";
      case "invalid":
        return "Le devis ne peut pas être transmis : vérifie qu’il a au moins une ligne, que sa date de validité n’est pas dépassée et que le client est actif.";
      case undefined:
        return null;
      default:
        return "La transmission a échoué. Réessaie, ou contacte l’administrateur si le problème continue.";
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
        eyebrow="PolyGest · Commercial"
        title={isDraft ? "Devis brouillon" : "Devis " + (quote.quote_number ?? "")}
        description={
          (workspace.company.trade_name || workspace.company.legal_name) +
          " · ID interne " +
          quote.id.slice(0, 8).toUpperCase() +
          (isDraft
            ? " · Aucun numéro attribué."
            : " · " + quoteStatusLabel(quote.status, locale) + ".")
        }
        actions={
          <Link href={cancelHref} className={SECONDARY_BUTTON}>
            Retour aux devis
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
              Client
            </p>
            <p className="mt-1 font-semibold text-[var(--pg-text)]">
              {customerName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              Date du devis
            </p>
            <p className="mt-1 font-medium text-[var(--pg-text)]">
              {formatQuoteDate(quote.issue_date, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              Valable jusqu’au
            </p>
            <p className="mt-1 font-medium text-[var(--pg-text)]">
              {formatQuoteDate(quote.valid_until, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--pg-text-muted)]">
              {isDraft ? "Total du brouillon" : "Total"}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--pg-text)]">
              {formatQuoteCurrency(quote.total_amount, quote.currency_code, locale)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--pg-text-muted)]">
          {isDraft
            ? "Ce document est encore en préparation. Il n’est ni numéroté, ni transmis, ni utilisable comme facture."
            : "Numéro provisoire interne aux devis, sans valeur de numéro de facture. Ce document n’est pas une facture."}
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
          Accepté le {quote.accepted_at ? formatQuoteDate(quote.accepted_at.slice(0, 10), locale) : "—"}
          {quote.acceptance_method && quote.acceptance_method in QUOTE_RESPONSE_METHOD_LABELS
            ? " · " + QUOTE_RESPONSE_METHOD_LABELS[quote.acceptance_method as keyof typeof QUOTE_RESPONSE_METHOD_LABELS]
            : ""}
          {quote.acceptance_reference ? " · Preuve : " + quote.acceptance_reference : ""}
        </p>
      ) : null}

      {quote.status === "rejected" ? (
        <p className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
          Refusé par le client le {quote.rejected_at ? formatQuoteDate(quote.rejected_at.slice(0, 10), locale) : "—"}.
        </p>
      ) : null}

      {quote.status === "cancelled" ? (
        <p className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
          Annulé le {quote.cancelled_at ? formatQuoteDate(quote.cancelled_at.slice(0, 10), locale) : "—"}
          {quote.cancellation_reason ? " · Motif : " + quote.cancellation_reason : ""}
        </p>
      ) : null}

      {quote.status === "sent" && workspace.canSend ? (
        <section className="mb-7 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            Réponse du client
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            Une acceptation exige une méthode et une référence de preuve (par exemple
            la date d’un courriel ou d’un message). Une réponse enregistrée est définitive.
          </p>
          <form action={recordQuoteResponse} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="quote_id" value={quote.id} />
            <div>
              <label htmlFor="decision" className="block text-sm font-medium text-[var(--pg-text)]">
                Décision du client
              </label>
              <select
                id="decision"
                name="decision"
                required
                defaultValue=""
                className="mt-1 min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)]"
              >
                <option value="" disabled>Choisir…</option>
                <option value="accepted">Devis accepté</option>
                <option value="rejected">Devis refusé</option>
              </select>
            </div>
            <div>
              <label htmlFor="method" className="block text-sm font-medium text-[var(--pg-text)]">
                Méthode (obligatoire si accepté)
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
                    {QUOTE_RESPONSE_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reference" className="block text-sm font-medium text-[var(--pg-text)]">
                Référence de preuve (obligatoire si accepté)
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
                Enregistrer la réponse
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {quote.status === "sent" && workspace.canCancel ? (
        <section className="mb-7 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            Annuler le devis
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            Réservé au propriétaire et à l’administrateur. Le devis annulé reste consultable
            et son numéro n’est jamais réattribué.
          </p>
          <form action={cancelQuote} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="quote_id" value={quote.id} />
            <div className="min-w-64 flex-1">
              <label htmlFor="cancellation_reason" className="block text-sm font-medium text-[var(--pg-text)]">
                Motif de l’annulation
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
              Annuler le devis
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
            Transmettre le devis
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            La transmission attribue un numéro provisoire (D-AAAA-NNNN) et conserve
            une copie des informations du client. Le devis ne sera plus modifiable.
            Enregistre d’abord tes modifications en cours.
          </p>
          <form action={sendQuote} className="mt-4">
            <input type="hidden" name="company_id" value={workspace.company.id} />
            <input type="hidden" name="quote_id" value={quote.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              Transmettre et numéroter
            </button>
          </form>
        </section>
      ) : null}

      {canEditDraft && customerError ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
        >
          Impossible de charger la liste des clients nécessaire à la modification.
        </p>
      ) : null}

      {canEditDraft && !customerError ? (
        <>
          {customers.filter((customer) => customer.active).length === 0 ? (
            <p
              role="status"
              className="mb-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
            >
              Aucun client actif n’est disponible. Réactive une fiche client avant
              de modifier ce devis.
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
              Lignes du devis
            </h2>
            <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
              Consultation en lecture seule.
            </p>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
              Aucune ligne disponible pour ce brouillon.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 text-right font-semibold">Quantité</th>
                    <th className="px-4 py-3 font-semibold">Unité</th>
                    <th className="px-4 py-3 text-right font-semibold">Prix unitaire</th>
                    <th className="px-4 py-3 font-semibold">Remise</th>
                    <th className="px-4 py-3 text-right font-semibold">Total ligne</th>
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
            <dt className="text-[var(--pg-text-muted)]">Sous-total</dt>
            <dd className="text-right tabular-nums text-[var(--pg-text)]">
              {formatQuoteCurrency(quote.subtotal_amount, quote.currency_code, locale)}
            </dd>
            <dt className="text-[var(--pg-text-muted)]">Remises</dt>
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
                Conditions commerciales
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--pg-text-muted)]">
                {quote.terms}
              </p>
            </section>
          ) : null}

          {quote.notes ? (
            <section className="border-t border-[var(--pg-border)] pt-4">
              <h3 className="font-semibold text-[var(--pg-text)]">
                Notes internes
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
