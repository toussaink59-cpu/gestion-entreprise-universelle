import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyCreationForm } from "@/components/companies/company-creation-form";
import { createAdditionalCompany } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-4 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

export default async function NewCompanyPage({ searchParams }: Props) {
  await connection();

  const params = await searchParams;
  const t = await getTranslations("Companies");
  const locale = await getLocale();
  const errorMessages: Record<string, string> = {
    "missing-name": t("errors.missingName"),
    "invalid-name": t("errors.invalidName"),
    "invalid-trade-name": t("errors.invalidTradeName"),
    "invalid-company-data": t("errors.invalidCompanyData"),
    "creation-failed": t("errors.creationFailed"),
  };
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const errorMessage =
    params.error && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, params.error)
      ? errorMessages[params.error]
      : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/dashboard" className={SECONDARY_BUTTON}>
            {t("backDashboard")}
          </Link>
        }
      />

      {errorMessage ? (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]"
        >
          {errorMessage}
        </p>
      ) : null}

      <section className="border-y border-[var(--pg-border)] py-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--pg-text)]">
            {t("informationTitle")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--pg-text-muted)]">
            {t("informationDescription")}
          </p>
        </div>
        <CompanyCreationForm
          action={createAdditionalCompany}
          submitLabel={t("submit")}
          locale={locale}
          labels={{
            legalName: t("form.legalName"),
            legalPlaceholder: t("form.legalPlaceholder"),
            tradeName: t("form.tradeName"),
            optional: t("form.optional"),
            tradePlaceholder: t("form.tradePlaceholder"),
          }}
        />
      </section>

      <p className="mt-5 text-sm leading-6 text-[var(--pg-text-muted)]">
        {t("ownerNotice")}
      </p>
    </main>
  );
}
