import { Suspense } from "react";
import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";

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
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
      >
        Chargement du répertoire clients…
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