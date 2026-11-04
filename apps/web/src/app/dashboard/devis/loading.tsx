import { PageHeader } from "@/components/ui/page-header";

export default function QuotesLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Commercial"
        title="Devis"
        description="Chargement des brouillons de l’entreprise…"
      />
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 text-sm text-[var(--pg-text-muted)]"
      >
        Chargement des devis…
      </div>
    </main>
  );
}
