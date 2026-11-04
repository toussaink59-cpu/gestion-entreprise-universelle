import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import type { ExpenseCompany } from "./workspace";

export function ExpenseCompanyChooser({
  companies,
}: {
  companies: ExpenseCompany[];
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Finance"
        title="Dépenses"
        description="Sélectionne l’entreprise concernée. Les données de dépenses restent strictement séparées entre les entreprises."
      />

      <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--pg-text)]">
          Choisir une entreprise
        </h2>
        <div className="mt-4 divide-y divide-[var(--pg-border)]">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={"/dashboard/depenses?company=" + encodeURIComponent(company.id)}
              className="block rounded-md px-3 py-4 hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
            >
              <span className="block font-semibold text-[var(--pg-text)]">
                {company.trade_name || company.legal_name}
              </span>
              <span className="mt-1 block text-sm text-[var(--pg-text-muted)]">
                {company.legal_name}
              </span>
              <span className="mt-2 block text-sm font-medium text-[var(--pg-accent)]">
                Ouvrir
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm">
          <Link
            href="/dashboard"
            className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline"
          >
            Retour au tableau de bord
          </Link>
        </p>
      </section>
    </main>
  );
}
