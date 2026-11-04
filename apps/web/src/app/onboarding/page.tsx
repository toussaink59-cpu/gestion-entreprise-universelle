import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyCreationForm } from "@/components/companies/company-creation-form";
import { createCompany } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { decideOnboardingAccess } from "@/lib/security/onboarding-access";

export const instant = false;

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  "missing-name": "La raison sociale est obligatoire.",
  "invalid-name": "La raison sociale doit contenir entre 2 et 200 caractères.",
  "invalid-trade-name": "Le nom commercial doit contenir entre 2 et 200 caractères.",
  "invalid-company-data": "Les informations de l’entreprise sont invalides. Vérifie les noms saisis.",
  "creation-failed": "La création a échoué. Vérifie les informations et réessaie.",
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  const accessDecision = decideOnboardingAccess(
    Boolean(membershipError),
    memberships,
  );

  if (accessDecision === "error") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="PolyGest · Configuration"
          title="Configurer ton entreprise"
          description="Une vérification de sécurité est nécessaire avant de créer ton premier espace."
        />
        <p
          role="alert"
          className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]"
        >
          Impossible de vérifier les entreprises associées à ce compte. Pour
          éviter une création en double, le formulaire reste temporairement
          indisponible.
        </p>
        <p className="mt-5 text-sm">
          <Link
            href="/onboarding"
            className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pg-focus)]"
          >
            Réessayer
          </Link>
        </p>
      </main>
    );
  }

  if (accessDecision === "dashboard") redirect("/dashboard");

  const errorMessage =
    params.error && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, params.error)
      ? ERROR_MESSAGES[params.error]
      : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Bienvenue"
        title="Créer ton espace d’entreprise"
        description="Renseigne les informations de ton entreprise pour commencer à organiser ton activité dans PolyGest."
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
            La raison sociale est obligatoire. Le nom commercial peut être
            renseigné plus tard.
          </p>
        </div>
        <CompanyCreationForm
          action={createCompany}
          submitLabel="Créer mon espace"
        />
      </section>

      <p className="mt-5 text-sm leading-6 text-[var(--pg-text-muted)]">
        Le compte qui crée cet espace reçoit automatiquement le rôle de
        propriétaire. Les accès des autres membres pourront être gérés ensuite.
      </p>
    </main>
  );
}
