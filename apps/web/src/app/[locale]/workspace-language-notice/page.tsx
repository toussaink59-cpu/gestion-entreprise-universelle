import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { isLocale } from "@/i18n/locale";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ continue?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, query] = await Promise.all([
    getTranslations({ locale, namespace: "WorkspaceNotice" }),
    searchParams,
  ]);
  const continuePath = getSafeRedirectPath(query.continue ?? null, "/dashboard");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-end">
        <LocaleSwitcher locale={locale} href="/workspace-language-notice" label={t("languageLabel")} />
      </div>
      <PageHeader title={t("title")} description={t("description")} />
      <Link
        href={continuePath}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
      >
        {t("continue")}
      ¶»§q«^