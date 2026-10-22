import { Suspense } from "react";
import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";

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
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
      >
        Chargement du répertoire fournisseurs…
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