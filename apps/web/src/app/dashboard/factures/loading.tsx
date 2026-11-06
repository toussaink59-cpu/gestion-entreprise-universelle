import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";

export default async function InvoicesLoading() {
  const t = await getTranslations("Invoices.List");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("loadingDescription")}
      />
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 text-sm text-[var(--pg-text-muted)]"
      >
        {t("loading")}
      </div>
    </main>
  );
}
