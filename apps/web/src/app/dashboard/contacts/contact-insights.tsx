import { createClient } from '@/lib/supabase/server';
import { getLocale, getTranslations } from 'next-intl/server';
import type { BusinessContactKind } from '@/lib/security/business-contact-validation';
import {
  detectContactDuplicates,
  type DuplicateContactCandidate,
  type DuplicateReason,
} from '@/lib/security/duplicate-detection';

type InsightContact = { id: string; name: string };

type QuoteRow = {
  id: string;
  customer_id: string;
  quote_number: string | null;
  status: string;
  issue_date: string;
  currency_code: string;
  total_amount: number | string;
};

type ExpenseRow = {
  id: string;
  supplier_id: string | null;
  expense_date: string;
  category: string;
  description: string;
  amount: number | string;
  currency_code: string;
}

type InvoiceHistoryRow = {
  id: string;
  customer_id: string;
  subject: string | null;
  status: 'draft' | 'abandoned_draft';
  issue_date: string;
  currency_code: string;
  total_amount: number | string;
};

const MAX_SCAN = 2000;
const MAX_HISTORY = 500;
const MAX_VISIBLE_PAIRS = 20;

function formatDate(value: string, locale: string): string {
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

function formatAmount(
  amount: number | string,
  currency: string,
  locale: string,
): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return String(amount) + ' ' + currency;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return value.toLocaleString(locale) + ' ' + currency;
  }
}

export async function ContactInsights({
  companyId,
  kind,
  contacts,
}: {
  companyId: string;
  kind: BusinessContactKind;
  contacts: InsightContact[];
}) {
  const supabase = await createClient();
  const t = await getTranslations('Contacts');
  const locale = await getLocale();

  const reasonLabels: Record<DuplicateReason, string> = {
    name: t('insights.reasons.name'),
    email: t('insights.reasons.email'),
    phone: t('insights.reasons.phone'),
    taxIdentifier: t('insights.reasons.taxIdentifier'),
  };

  const table = kind === 'customer' ? 'customers' : 'suppliers';
  const { data: scanData, error: scanError } = await supabase
    .from(table)
    .select('id, company_id, name, email, phone, tax_identifier')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(MAX_SCAN);

  if (scanError) {
    console.error('Contact duplicate scan failed:', { code: scanError.code });
  }

  const candidates = (scanData ?? []) as DuplicateContactCandidate[];
  const duplicateResult = detectContactDuplicates(candidates);
  const candidateById = new Map(candidates.map((contact) => [contact.id, contact]));
  const contactIds = contacts.map((contact) => contact.id);

  let quoteRows: QuoteRow[] = [];
  let invoiceRows: InvoiceHistoryRow[] = [];
  let expenseRows: ExpenseRow[] = [];
  let historyError = false;
  let historyTruncated = false;

  // These authenticated reads remain subject to the existing Supabase RLS policies.
  if (contactIds.length > 0 && kind === 'customer') {
    const [quotesResult, invoicesResult] = await Promise.all([
      supabase
        .from('quotes')
        .select('id, customer_id, quote_number, status, issue_date, currency_code, total_amount')
        .eq('company_id', companyId)
        .in('customer_id', contactIds)
        .order('issue_date', { ascending: false })
        .limit(MAX_HISTORY),
      supabase
        .from('invoices')
        .select('id, customer_id, subject, status, issue_date, currency_code, total_amount')
        .eq('company_id', companyId)
        .in('customer_id', contactIds)
        .in('status', ['draft', 'abandoned_draft'])
        .order('issue_date', { ascending: false })
        .limit(MAX_HISTORY),
    ]);

    if (quotesResult.error) {
      historyError = true;
      console.error('Customer quote history failed:', { code: quotesResult.error.code });
    } else {
      quoteRows = (quotesResult.data ?? []) as QuoteRow[];
      historyTruncated = quoteRows.length === MAX_HISTORY;
    }

    if (invoicesResult.error) {
      historyError = true;
      console.error('Customer invoice history failed:', { code: invoicesResult.error.code });
    } else {
      invoiceRows = (invoicesResult.data ?? []) as InvoiceHistoryRow[];
      historyTruncated ||= invoiceRows.length === MAX_HISTORY;
    }
  }

  if (contactIds.length > 0 && kind === 'supplier') {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, supplier_id, expense_date, category, description, amount, currency_code')
      .eq('company_id', companyId)
      .in('supplier_id', contactIds)
      .order('expense_date', { ascending: false })
      .limit(MAX_HISTORY);

    if (error) {
      historyError = true;
      console.error('Supplier expense history failed:', { code: error.code });
    } else {
      expenseRows = (data ?? []) as ExpenseRow[];
      historyTruncated = expenseRows.length === MAX_HISTORY;
    }
  }

  const quotesByContact = new Map<string, QuoteRow[]>();
  for (const quote of quoteRows) {
    const group = quotesByContact.get(quote.customer_id) ?? [];
    group.push(quote);
    quotesByContact.set(quote.customer_id, group);
  }

  const invoicesByContact = new Map<string, InvoiceHistoryRow[]>();
  for (const invoice of invoiceRows) {
    const group = invoicesByContact.get(invoice.customer_id) ?? [];
    group.push(invoice);
    invoicesByContact.set(invoice.customer_id, group);
  }

  const expensesByContact = new Map<string, ExpenseRow[]>();
  for (const expense of expenseRows) {
    if (!expense.supplier_id) continue;
    const group = expensesByContact.get(expense.supplier_id) ?? [];
    group.push(expense);
    expensesByContact.set(expense.supplier_id, group);
  }

  const historyGroups = contacts
    .map((contact) => ({
      contact,
      quotes: quotesByContact.get(contact.id) ?? [],
      invoices: invoicesByContact.get(contact.id) ?? [],
      expenses: expensesByContact.get(contact.id) ?? [],
    }))
    .filter((group) => group.quotes.length > 0 || group.invoices.length > 0 || group.expenses.length > 0);

  const quoteStatusLabels: Record<string, string> = {
    draft: t('insights.quoteStatuses.draft'),
    sent: t('insights.quoteStatuses.sent'),
    accepted: t('insights.quoteStatuses.accepted'),
    rejected: t('insights.quoteStatuses.rejected'),
    cancelled: t('insights.quoteStatuses.cancelled'),
  };
  const invoiceStatusLabels: Record<InvoiceHistoryRow['status'], string> = {
    draft: t('insights.invoiceStatuses.draft'),
    abandoned_draft: t('insights.invoiceStatuses.abandonedDraft'),
  };

  const visiblePairs = duplicateResult.matches.slice(0, MAX_VISIBLE_PAIRS);

  return (
    <div className='mb-8 space-y-6'>
      <section
        aria-labelledby='contact-duplicates-title'
        className='rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6'
      >
        <div>
          <h2 id='contact-duplicates-title' className='text-lg font-semibold text-[var(--pg-text)]'>
            {t('insights.duplicatesTitle')}
          </h2>
          <p className='mt-1 text-sm text-[var(--pg-text-muted)]'>
            {t('insights.duplicatesDescription')}
          </p>
        </div>

        {scanError ? (
          <p role='alert' className='mt-4 text-sm text-[var(--pg-text-muted)]'>
            {t('insights.duplicateScanUnavailable')}
          </p>
        ) : visiblePairs.length === 0 ? (
          <p className='mt-4 text-sm text-[var(--pg-text-muted)]'>
            {t('insights.noDuplicates')}
          </p>
        ) : (
          <>
            <p className='mt-4 text-sm font-medium text-[var(--pg-text)]'>
              {t('insights.duplicatePairCount', { count: duplicateResult.matches.length })}
            </p>
            <ul className='mt-3 divide-y divide-[var(--pg-border)]'>
              {visiblePairs.map((pair) => {
                const first = candidateById.get(pair.contactId);
                const second = candidateById.get(pair.duplicateContactId);
                if (!first || !second) return null;

                return (
                  <li key={pair.contactId + ':' + pair.duplicateContactId} className='py-3'>
                    <div className='flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--pg-text)]'>
                      <span>{first.name}</span>
                      <span aria-hidden='true' className='text-[var(--pg-text-muted)]'>↔</span>
                      <span>{second.name}</span>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {pair.reasons.map((reason) => (
                        <span
                          key={reason}
                          className='rounded-md bg-[var(--pg-surface-subtle)] px-2 py-1 text-xs text-[var(--pg-text-muted)]'
                        >
                          {reasonLabels[reason]}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            {duplicateResult.truncated || duplicateResult.matches.length > MAX_VISIBLE_PAIRS ? (
              <p className='mt-3 text-xs text-[var(--pg-text-muted)]'>
                {t('insights.duplicateResultsLimited')}
              </p>
            ) : null}
          </>
        )}

        {candidates.length >= MAX_SCAN ? (
          <p className='mt-3 text-xs text-[var(--pg-text-muted)]'>
            {t('insights.duplicateScanLimited')}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby='contact-history-title'
        className='rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6'
      >
        <h2 id='contact-history-title' className='text-lg font-semibold text-[var(--pg-text)]'>
          {kind === 'customer'
            ? t('insights.historyCustomersTitle')
            : t('insights.historySuppliersTitle')}
        </h2>
        <p className='mt-1 text-sm text-[var(--pg-text-muted)]'>
          {kind === 'customer'
            ? t('insights.historyCustomersDescription')
            : t('insights.historySuppliersDescription')}
        </p>

        {historyError ? (
          <p role='alert' className='mt-4 text-sm text-[var(--pg-text-muted)]'>
            {t('insights.historyUnavailable')}
          </p>
        ) : historyGroups.length === 0 ? (
          <p className='mt-4 text-sm text-[var(--pg-text-muted)]'>
            {t('insights.noHistory')}
          </p>
        ) : (
          <div className='mt-4 divide-y divide-[var(--pg-border)]'>
            {historyGroups.map(({ contact, quotes, invoices, expenses }) => (
              <details key={contact.id} className='py-3'>
                <summary className='cursor-pointer font-medium text-[var(--pg-text)]'>
                  {contact.name}
                  <span className='ml-2 text-xs font-normal text-[var(--pg-text-muted)]'>
                    {t('insights.historyItemsCount', {
                      count: kind === 'customer' ? quotes.length + invoices.length : expenses.length,
                    })}
                  </span>
                </summary>

                <div className='mt-3 space-y-3'>
                  {quotes.map((quote) => (
                    <article key={quote.id} className='rounded-md border border-[var(--pg-border)] p-3'>
                      <div className='flex flex-wrap justify-between gap-2'>
                        <p className='text-sm font-medium text-[var(--pg-text)]'>
                          {quote.quote_number
                            ? t('insights.quoteNumber', { number: quote.quote_number })
                            : t('insights.quoteWithoutNumber')}
                        </p>
                        <span className='text-xs text-[var(--pg-text-muted)]'>
                          {quoteStatusLabels[quote.status] ?? quote.status}
                        </span>
                      </div>
                      <div className='mt-1 flex flex-wrap justify-between gap-2 text-sm'>
                        <time dateTime={quote.issue_date} className='text-[var(--pg-text-muted)]'>
                          {formatDate(quote.issue_date, locale)}
                        </time>
                        <span className='font-medium text-[var(--pg-text)]'>
                          {formatAmount(quote.total_amount, quote.currency_code, locale)}
                        </span>
                      </div>
                    </article>
                  ))}

                  {invoices.map((invoice) => (
                    <article key={invoice.id} className='rounded-md border border-[var(--pg-border)] p-3'>
                      <div className='flex flex-wrap justify-between gap-2'>
                        <p className='text-sm font-medium text-[var(--pg-text)]'>
                          {invoice.subject || t('insights.invoiceWithoutSubject')}
                        </p>
                        <span className='text-xs text-[var(--pg-text-muted)]'>
                          {invoiceStatusLabels[invoice.status]}
                        </span>
                      </div>
                      <div className='mt-1 flex flex-wrap justify-between gap-2 text-sm'>
                        <time dateTime={invoice.issue_date} className='text-[var(--pg-text-muted)]'>
                          {formatDate(invoice.issue_date, locale)}
                        </time>
                        <span className='font-medium text-[var(--pg-text)]'>
                          {formatAmount(invoice.total_amount, invoice.currency_code, locale)}
                        </span>
                      </div>
                    </article>
                  ))}

                  {expenses.map((expense) => (
                    <article key={expense.id} className='rounded-md border border-[var(--pg-border)] p-3'>
                      <div className='flex flex-wrap justify-between gap-2'>
                        <p className='text-sm font-medium text-[var(--pg-text)]'>{expense.category}</p>
                        <span className='text-xs text-[var(--pg-text-muted)]'>
                          {t('insights.expenseDraft')}
                        </span>
                      </div>
                      <p className='mt-1 text-sm text-[var(--pg-text-muted)]'>{expense.description}</p>
                      <div className='mt-2 flex flex-wrap justify-between gap-2 text-sm'>
                        <time dateTime={expense.expense_date} className='text-[var(--pg-text-muted)]'>
                          {formatDate(expense.expense_date, locale)}
                        </time>
                        <span className='font-medium text-[var(--pg-text)]'>
                          {formatAmount(expense.amount, expense.currency_code, locale)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}

        {historyTruncated ? (
          <p className='mt-3 text-xs text-[var(--pg-text-muted)]'>
            {t('insights.historyLimited')}
          </p>
        ) : null}
      </section>
    </div>
  );
}
