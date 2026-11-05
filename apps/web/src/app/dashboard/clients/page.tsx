import { Suspense } from "react";
import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";
import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";

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

function ClientsPageFallback({ title, description, loading }: { title: string; description: string; loading: string }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader eyebrow="PolyGest · Répertoires" title={title} description={description} />
      <div role="status" aria-live="polite" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 text-sm text-[var(--pg-text-muted)]">{loading}</div>
    </main>
  );
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const t = await getTranslations("Contacts");
  const title = t("titleCustomers");
  return (
    <Suspense fallback={<ClientsPageFallback title={title} description={t("loadingCustomers")} loading={t("loading")} />}>
      <ContactsPage kind="customer" searchParams={searchParams} />
    </Suspense>
  );
}
