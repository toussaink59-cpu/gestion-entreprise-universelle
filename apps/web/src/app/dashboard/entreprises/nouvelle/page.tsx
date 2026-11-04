import Link from "next/link";
import { connection } from "next/server";
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

const ERROR_MESSAGES: Record<string, string> = {
  "missing-name": "La raison sociale est obligatoire.",
  "invalid-name": "La raison sociale doit contenir entre 2 et 200 caractères.",
  "invalid-trade-name": "Le nom commercial doit contenir entre 2 et 200 caractères.",
  "invalid-company-data": "Les informations de l’entreprise sont invalides. Vérifie les noms saisis.",
  "creation-failed": "La création a échoué. Vérifie tes droits et réessaie.",
};

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-4 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

export default async function NewCompanyPage({ searchParams }: Props) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const errorMessage =
    params.error && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, params.error)
      ? ERROR_MESSAGES[params.error]
      : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Entreprises"
        title="Créer une entreprise"
        description="Ajoute un nouvel espace de gestion indépendant à ton compte."
        actions={
          <Link href="/dashboard" className={SECONDARY_BUTTON}>
            Retour au tableau de bord
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
            Informations de l’entreprise
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--pg-text-muted)]">
            Chaque entreprise possède ses propres membres, répertoires et
            données de gestion.
          </p>
        </div>
        <CompanyCreationForm
          action={createAdditionalCompany}
          submitLabel="Créer l’entreprise"
        />
      </section>

      <p className="mt-5 text-sm leading-6 text-[var(--pg-text-muted)]">
        Tu deviendras propriétaire de ce nouvel espace. Aucun plafond fixe de
        création n’est appliqué au périmètre MVP.
      </p>
    </main>
  );
}
