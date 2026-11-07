"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveInvoiceDraft } from "./actions";
import type { InvoiceCustomerOption } from "./types";

type DiscountType = "none" | "percentage" | "fixed";
type Line = {
  key: string;
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  discount_type: DiscountType;
  discount_value: string;
};

const INPUT =
  "mt-1 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:opacity-60";
const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-60";
const LABEL = "text-sm font-medium text-[var(--pg-text)]";
const DECIMAL = "[0-9]+([,.][0-9]{1,4})?";

export type InvoiceDraftInitial = {
  invoiceId: string;
  customerId: string;
  issueDate: string;
  dueDate: string | null;
  subject: string;
  terms: string;
  notes: string;
  lines: Array<Omit<Line, "key">>;
};

export function InvoiceDraftForm({
  companyId,
  currencyCode,
  customers,
  cancelHref,
  defaultUnit,
  today,
  initial,
}: {
  companyId: string;
  currencyCode: string;
  customers: InvoiceCustomerOption[];
  cancelHref: string;
  defaultUnit: string;
  today: string;
  initial?: InvoiceDraftInitial;
}) {
  const t = useTranslations("Invoices.Form");
  const [state, formAction, pending] = useActionState(saveInvoiceDraft, { error: null });
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const newLine = (key: number): Line => ({
    key: String(key),
    description: "",
    quantity: "1",
    unit_label: defaultUnit,
    unit_price: "0",
    discount_type: "none",
    discount_value: "0",
  });
  const [lines, setLines] = useState<Line[]>(
    initial && initial.lines.length > 0
      ? initial.lines.map((line, index) => ({ ...line, key: String(index) }))
      : [newLine(0)],
  );
  const [nextKey, setNextKey] = useState(initial ? Math.max(initial.lines.length, 1) : 1);

  const update = (key: string, changes: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));

  const errorKeys = ["context", "fields", "lines", "session", "permission", "invalidData", "save"];
  const errorMessage = state.error
    ? errorKeys.includes(state.error)
      ? t("errors." + state.error)
      : t("errors.generic")
    : null;

  const linesPayload = JSON.stringify(
    lines.map(({ description, quantity, unit_label, unit_price, discount_type, discount_value }) => ({
      description, quantity, unit_label, unit_price, discount_type, discount_value,
    })),
  );

  return (
    <form action={formAction} autoComplete="off" className="space-y-8">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="lines_json" value={linesPayload} />
      {initial ? <input type="hidden" name="invoice_id" value={initial.invoiceId} /> : null}

      {errorMessage ? (
        <p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">
          {errorMessage}
        </p>
      ) : null}

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">{t("general")}</h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">{t("draftNotice")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className={LABEL}>
            {t("customer")}
            <select className={INPUT} name="customer_id" required defaultValue={initial?.customerId ?? customers[0]?.id} disabled={pending}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            {t("issueDate")}
            <input
              className={INPUT}
              type="date"
              name="issue_date"
              required
              value={issueDate}
              onChange={(event) => {
                setIssueDate(event.target.value);
                if (dueDate && dueDate < event.target.value) setDueDate(event.target.value);
              }}
              disabled={pending}
            />
          </label>
          <label className={LABEL}>
            {t("dueDate")} <span className="font-normal text-[var(--pg-text-muted)]">{t("optional")}</span>
            <input
              className={INPUT}
              type="date"
              name="due_date"
              min={issueDate}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={pending}
            />
          </label>
          <label className={LABEL + " sm:col-span-2 xl:col-span-3"}>
            {t("subject")} <span className="font-normal text-[var(--pg-text-muted)]">{t("optional")}</span>
            <input className={INPUT} type="text" name="subject" maxLength={200} defaultValue={initial?.subject ?? ""} disabled={pending} />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--pg-border)] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--pg-text)]">{t("lines")}</h2>
            <p className="mt-1 text-sm text-[var(--pg-text-muted)]">{t("linesDescription", { currency: currencyCode })}</p>
          </div>
          <button
            type="button"
            className={SECONDARY}
            disabled={pending || lines.length >= 100}
            onClick={() => {
              setLines((current) => [...current, newLine(nextKey)]);
              setNextKey((current) => current + 1);
            }}
          >
            {t("addLine")}
          </button>
        </div>

        <div className="divide-y divide-[var(--pg-border)]">
          {lines.map((line, index) => (
            <fieldset key={line.key} className="py-5">
              <legend className="mb-3 font-semibold text-[var(--pg-text)]">{t("lineNumber", { number: index + 1 })}</legend>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--pg-text-muted)] underline underline-offset-4 hover:text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pending || lines.length <= 1}
                  aria-label={t("removeLine", { number: index + 1 })}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  {t("remove")}
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <label className={LABEL + " sm:col-span-2 xl:col-span-3"}>
                  {t("description")}
                  <input className={INPUT} type="text" maxLength={500} required value={line.description} disabled={pending}
                    onChange={(event) => update(line.key, { description: event.target.value })} />
                </label>
                <label className={LABEL}>
                  {t("quantity")}
                  <input className={INPUT} type="text" inputMode="decimal" pattern={DECIMAL} maxLength={19} required value={line.quantity} disabled={pending}
                    onChange={(event) => update(line.key, { quantity: event.target.value })} />
                </label>
                <label className={LABEL}>
                  {t("unit")}
                  <input className={INPUT} type="text" maxLength={40} required value={line.unit_label} disabled={pending}
                    onChange={(event) => update(line.key, { unit_label: event.target.value })} />
                </label>
                <label className={LABEL}>
                  {t("unitPrice")}
                  <input className={INPUT} type="text" inputMode="decimal" pattern={DECIMAL} maxLength={21} required value={line.unit_price} disabled={pending}
                    onChange={(event) => update(line.key, { unit_price: event.target.value })} />
                </label>
                <label className={LABEL}>
                  {t("discountType")}
                  <select className={INPUT} value={line.discount_type} disabled={pending}
                    onChange={(event) => {
                      const next = event.target.value as DiscountType;
                      update(line.key, { discount_type: next, discount_value: next === "none" ? "0" : line.discount_value });
                    }}>
                    <option value="none">{t("discountNone")}</option>
                    <option value="percentage">{t("discountPercentage")}</option>
                    <option value="fixed">{t("discountFixed")}</option>
                  </select>
                </label>
                <label className={LABEL}>
                  {t("discountValue")}
                  <input className={INPUT} type="text" inputMode="decimal" pattern={DECIMAL} maxLength={21} value={line.discount_value}
                    disabled={pending || line.discount_type === "none"}
                    onChange={(event) => update(line.key, { discount_value: event.target.value })} />
                  <span className="mt-1 block text-xs font-normal text-[var(--pg-text-muted)]">
                    {line.discount_type === "percentage" ? t("percentageHelp") : line.discount_type === "fixed" ? t("fixedHelp") : t("noneHelp")}
                  </span>
                </label>
              </div>
            </fieldset>
          ))}
        </div>
        {lines.length >= 100 ? <p className="text-sm text-[var(--pg-text-muted)]">{t("lineLimit")}</p> : null}
      </section>

      <section className="grid gap-4 border-t border-[var(--pg-border)] pt-6 sm:grid-cols-2">
        <label className={LABEL}>
          {t("terms")} <span className="font-normal text-[var(--pg-text-muted)]">{t("optional")}</span>
          <textarea className={INPUT} name="terms" rows={4} maxLength={5000} defaultValue={initial?.terms ?? ""} disabled={pending} />
        </label>
        <label className={LABEL}>
          {t("notes")} <span className="font-normal text-[var(--pg-text-muted)]">{t("optional")}</span>
          <textarea className={INPUT} name="notes" rows={4} maxLength={5000} defaultValue={initial?.notes ?? ""} disabled={pending} />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pg-border)] pt-5">
        <p className="max-w-2xl text-xs leading-5 text-[var(--pg-text-muted)]">{t("taxNote")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <a href={cancelHref} className={SECONDARY}>{t("cancel")}</a>
          <button type="submit" className={PRIMARY} disabled={pending}>
            {pending ? t("saving") : t("saveDraft")}
          </button>
        </div>
      </div>
    </form>
  );
}
