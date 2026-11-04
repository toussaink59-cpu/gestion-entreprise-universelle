import { Suspense } from "react";
import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";
import { PageHeader } from "@/components/ui/page-header";

export const instant = false;

type FournisseursPageProps = {
  searchParams: Promise<{
    company?: string;
    q?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

function FournisseursPageFallback() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Répertoires"
        title="Fournisseurs"
        description="Chargement du répertoire fournisseurs…"
      />
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 text-sm text-[var(--pg-text-muted)]"
      >
        Chargement en cours…
      </div>
    </main>
  );
}

export default function FournisseursPage({ searchParams }: FournisseursPageProps) {
  return (
    <Suspense fallback={<FournisseursPageFallback />}>
      <ContactsPage kind="supplier" searchParams={searchParams} />
    </Suspense>
  );
}
