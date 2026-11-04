"use client";

import { useActionState } from "react";
import { saveExpenseDraft } from "./actions";

type SupplierOption = {
  id: string;
  name: string;
};

const INPUT_CLASS =
  "mt-1 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-not-allowed disabled:opacity-60";

export function ExpenseDraftForm({
  companyId,
  currencyCode,
  suppliers,
  expenseDate,
  cancelHref,
}: {
  companyId: string;
  currencyCode: string;
  suppliers: SupplierOption[];
  expenseDate: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(saveExpenseDraft, {
    error: null,
  });

  return (
    <form action={formAction} autoComplete="off" className="space-y-7">
      <input type="hidden" name="company_id" value={companyId} />

      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]"
        >
          {state.error}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            Informations sur la dépense
          </h2>
          <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
            Le brouillon est enregistré dans la devise de l’entreprise ({currencyCode}).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--pg-text)]">
            Date de la dépense *
            <input
              className={INPUT_CLASS}
              type="date"
              name="expense_date"
              required
              defaultValue={expenseDate}
              disabled={pending}
            />
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)]">
            Catégorie *
            <input
              className={INPUT_CLASS}
              type="text"
              name="category"
              minLength={2}
              maxLength={100}
              required
              placeholder="Ex. : Transport, fournitures, maintenance"
              disabled={pending}
            />
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)] sm:col-span-2">
            Description *
            <input
              className={INPUT_CLASS}
              type="text"
              name="description"
              minLength={2}
              maxLength={500}
              required
              placeholder="Décris l’objet de la dépense"
              disabled={pending}
            />
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)]">
            Montant ({currencyCode}) *
            <input
              className={INPUT_CLASS}
              type="text"
              name="amount"
              inputMode="decimal"
              pattern="[0-9]{1,16}([,.][0-9]{1,4})?"
              maxLength={21}
              required
              aria-describedby="expense-amount-help"
              placeholder="0"
              disabled={pending}
            />
            <span
              id="expense-amount-help"
              className="mt-1 block text-xs font-normal text-[var(--pg-text-muted)]"
            >
              Montant positif, jusqu’à quatre décimales. Les taxes ne sont pas calculées dans cette étape.
            </span>
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)]">
            Fournisseur
            <select
              className={INPUT_CLASS}
              name="supplier_id"
              defaultValue=""
              disabled={pending}
            >
              <option value="">Non renseigné</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-[var(--pg-text)] sm:col-span-2">
            Notes internes
            <textarea
              className={INPUT_CLASS + " min-h-28"}
              name="notes"
              maxLength={2000}
              rows={4}
              disabled={pending}
            />
          </label>
        </div>
      </section>

      <div className="border-t border-[var(--pg-border)] pt-5">
        <p className="mb-4 text-sm leading-6 text-[var(--pg-text-muted)]">
          L’enregistrement crée uniquement un brouillon. Aucun paiement, mouvement de caisse, calcul fiscal ou écriture comptable n’est déclenché.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className={PRIMARY_BUTTON_CLASS}
            disabled={pending}
          >
            {pending ? "Enregistrement…" : "Enregistrer le brouillon"}
          </button>
          <a
            href={cancelHref}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-4 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
          >
            Annuler
          </a>
        </div>
      </div>
    </form>
  );
}
