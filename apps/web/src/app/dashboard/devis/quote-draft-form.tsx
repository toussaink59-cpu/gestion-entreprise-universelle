"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveQuoteDraft } from "./actions";
import type {
  QuoteCustomerOption,
  QuoteDraftInitialValues,
  QuoteLineFormValue,
} from "./types";

type LineState = QuoteLineFormValue & { key: string };

const INPUT_CLASS =
  "mt-1 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-60";

export function QuoteDraftForm({
  companyId,
  currencyCode,
  customers,
  initial,
  cancelHref,
}: {
  companyId: string;
  currencyCode: string;
  customers: QuoteCustomerOption[];
  initial: QuoteDraftInitialValues;
  cancelHref: string;
}) {
  const t = useTranslations("Quotes.Form");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(saveQuoteDraft,
    error: null,
  });

  const [customerId, setCustomerId] = useState(initial.customerId);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [subject, setSubject] = useState(initial.subject);
  const [terms, setTerms] = useState(initial.terms);
  const [notes, setNotes] = useState(initial.notes);
  const [lines, setLines] = useState<LineState[]>(() =>
    initial.lines.map((line, index) => ({ ...line, key: String(index) })),
  );
  const [nextKey, setNextKey] = useState(initial.lines.length);

  function updateLine(key: string, changes: Partial<QuoteLineFormValue>) {
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, ...changes } : line,
      ),
    );
  }

  function addLine() {
    if (lines.length >= 100) return;
    setLines((current) => [
      ...current,
      {
        key: String(nextKey),
        description: "",
        quantity: "1",
        unit_label: locale === "en" ? "unit" : "unité",
        unit_price: "0",
        discount_type: "none",
        discount_value: "0",
      },
    ]);
    setNextKey((current) => current + 1);
  }

  function removeLine(key: string) {
    if (lines.length <= 1) return;
    setLines((current) => current.filter((line) => line.key !== key));
  }

  const actionError = state.error === "context" ? t("errors.context")
    : state.error === "lines" ? t("errors.lines")
    : state.error === "fields" ? t("errors.fields")
    : state.error === "session" ? t("errors.session")
    : state.error === "company" ? t("errors.company")
    : state.error === "permission" ? t("errors.permission")
    : state.error === "invalidData" ? t("errors.invalidData")
    : state.error === "save" ? t("errors.save")
    : state.error ? t("errors.generic") : null;

  const linesPayload = JSON.stringify(
    lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unit_label,
      unit_price: line.unit_price,
      discount_type: line.discount_type,
      discount_value: line.discount_value,
    })),
  );

  return (
    <form action={formAction} autoComplete="off" className="space-y-8">
      <input type="hidden" name="company_id" value={companyId} />
      <input
        type="hidden"
        name="quote_id"
        value={initial.quoteId ?? ""}
      />
      <input type="hidden" name="lines_json" value={linesPayload} />

      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]"
        >
          {actionError}
        </p>
      ) : null}

      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            {t("general")}
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            {t("internalDraft")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-[var(--pg-text)]">
            {t("customer")}
            <select
              className={INPUT_CLASS}
              name="customer_id"
              required
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              disabled={pending}
            >
              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                  disabled={!customer.active}
                >
                  {customer.name + (customer.active ? "" : " " + t("archived"))}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)]">
            {t("issueDate")}
            <input
              className={INPUT_CLASS}
              type="date"
              name="issue_date"
              required
              value={issueDate}
              onChange={(event) => {
                setIssueDate(event.target.value);
                if (validUntil < event.target.value) {
                  setValidUntil(event.target.value);
                }
              }}
              disabled={pending}
            />
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)]">
            {t("validUntil")}
            <input
              className={INPUT_CLASS}
              type="date"
              name="valid_until"
              required
              min={issueDate}
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              disabled={pending}
            />
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)] sm:col-span-2 xl:col-span-3">
            {t("subject")}
            <input
              className={INPUT_CLASS}
              type="text"
              name="subject"
              maxLength={200}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={pending}
              placeholder={t("subjectPlaceholder")}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--pg-border)] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--pg-text)]">
              {t("lines")}
            </h2>
            <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
              {t("linesDescription", { currency: currencyCode })}
            </p>
          </div>
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            onClick={addLine}
            disabled={pending || lines.length >= 100}
          >
            {t("addLine")}
          </button>
        </div>

        <div className="divide-y divide-[var(--pg-border)]">
          {lines.map((line, index) => (
            <fieldset key={line.key} className="py-5">
              <legend className="mb-3 font-semibold text-[var(--pg-text)]">
                {t("lineNumber", { number: index + 1 })}
              </legend>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--pg-text-muted)] underline underline-offset-4 hover:text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => removeLine(line.key)}
                  disabled={pending || lines.length <= 1}
                  aria-label={t("removeLine", { number: index + 1 })}
                >
                  {t("remove")}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <label className="text-sm font-medium text-[var(--pg-text)] sm:col-span-2 xl:col-span-3">
                  {t("description")}
                  <input
                    className={INPUT_CLASS}
                    type="text"
                    maxLength={500}
                    required
                    value={line.description}
                    onChange={(event) =>
                      updateLine(line.key, {
                        description: event.target.value,
                      })
                    }
                    disabled={pending}
                  />
                </label>

                <label className="text-sm font-medium text-[var(--pg-text)]">
                  {t("quantity")}
                  <input
                    className={INPUT_CLASS}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+([,.][0-9]{1,4})?"
                    maxLength={19}
                    required
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.key, { quantity: event.target.value })
                    }
                    disabled={pending}
                  />
                </label>

                <label className="text-sm font-medium text-[var(--pg-text)]">
                  {t("unit")}
                  <input
                    className={INPUT_CLASS}
                    type="text"
                    maxLength={40}
                    required
                    value={line.unit_label}
                    onChange={(event) =>
                      updateLine(line.key, { unit_label: event.target.value })
                    }
                    disabled={pending}
                    placeholder={t("unitPlaceholder")}
                  />
                </label>

                <label className="text-sm font-medium text-[var(--pg-text)]">
                  {t("unitPrice")}
                  <input
                    className={INPUT_CLASS}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+([,.][0-9]{1,4})?"
                    maxLength={21}
                    required
                    value={line.unit_price}
                    onChange={(event) =>
                      updateLine(line.key, { unit_price: event.target.value })
                    }
                    disabled={pending}
                  />
                </label>

                <label className="text-sm font-medium text-[var(--pg-text)]">
                  {t("discountType")}
                  <select
                    className={INPUT_CLASS}
                    value={line.discount_type}
                    onChange={(event) => {
                      const nextType = event.target.value as
                        | "none"
                        | "percentage"
                        | "fixed";
                      updateLine(line.key, {
                        discount_type: nextType,
                        discount_value:
                          nextType === "none" ? "0" : line.discount_value,
                      });
                    }}
                    disabled={pending}
                  >
                    <option value="none">{t("discountNone")}</option>
                    <option value="percentage">{t("discountPercentage")}</option>
                    <option value="fixed">{t("discountFixed")}</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-[var(--pg-text)]">
                  {t("discountValue")}
                  <input
                    className={INPUT_CLASS}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+([,.][0-9]{1,4})?"
                    maxLength={21}
                    value={line.discount_value}
                    onChange={(event) =>
                      updateLine(line.key, {
                        discount_value: event.target.value,
                      })
                    }
                    disabled={pending || line.discount_type === "none"}
                  />
                  <span className="mt-1 block text-xs font-normal text-[var(--pg-text-muted)]">
                    {line.discount_type === "percentage"
                      ? t("percentageHelp")
                      : line.discount_type === "fixed"
                        ? t("fixedHelp")
                        : t("noneHelp")}
                  </span>
                </label>
              </div>
            </fieldset>
          ))}
        </div>

        {lines.length >= 100 ? (
          <p className="text-sm text-[var(--pg-text-muted)]">
            {t("lineLimit")}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 border-t border-[var(--pg-border)] pt-6 sm:grid-cols-2">
        <label className="text-sm font-medium text-[var(--pg-text)]">
          {t("terms")}
          <textarea
            className={INPUT_CLASS}
            name="terms"
            rows={4}
            maxLength={5000}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            disabled={pending}
          />
        </label>

        <label className="text-sm font-medium text-[var(--pg-text)]">
          {t("notes")}
          <textarea
            className={INPUT_CLASS}
            name="notes"
            rows={4}
            maxLength={5000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={pending}
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pg-border)] pt-5">
        <p className="max-w-2xl text-xs leading-5 text-[var(--pg-text-muted)]">
          {t("taxNote")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={cancelHref}
            className={SECONDARY_BUTTON_CLASS}
          >
            {t("cancel")}
          </a>
          <button
            type="submit"
            className={PRIMARY_BUTTON_CLASS}
            disabled={pending || customers.filter((customer) => customer.active).length === 0}
          >
            {pending ? t("saving") : t("saveDraft")}
          </button>
        </div>
      </div>
    </form>
  );
}
