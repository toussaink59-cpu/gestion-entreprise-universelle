import { Suspense } from "react";
import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";
import { PageHeader } from "@/components/ui/page-header";

export const instant = false;

type ClientsPageProps = {
  searchParams: Promise<{
    company?: string;
    q?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

function ClientsPageFallback() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Répertoires"
        title="Clients"
        description="Chargement du répertoire clients…"
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

export default function ClientsPage({ searchParams }: ClientsPageProps) {
  return (
    <Suspense fallback={<ClientsPageFallback />}>
      <ContactsPage kind="customer" searchParams={searchParams} />
    </Suspense>
  );
}
