import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdditionalCompany } from "@/app/onboarding/actions";

export const instant = false;

const OWNER_COMPANY_LIMIT = 5;

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  "missing-name": "La raison sociale est obligatoire.",
  "invalid-name": "La raison sociale doit contenir entre 2 et 200 caractères.",
  "invalid-trade-name": "Le nom commercial doit contenir entre 2 et 200 caractères.",
  "invalid-company-data": "Les informations de l'entreprise sont invalides.",
  "limit-reached": "La limite de cinq entreprises dont tu es propriétaire est atteinte.",
  "creation-failed": "La création a échoué. Vérifie tes droits et réessaie.",
};

export default async function NewCompanyPage({ searchParams }: Props) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: ownedMemberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("role_code", "owner")
    .eq("status", "active");

  if (membershipError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-950">
          Nouvelle entreprise
        </h1>

       <p
  role="alert"
  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
>
  Impossible de vérifier le nombre d&apos;entreprises associées à ton
  compte. Pour ta sécurité, la création est temporairement bloquée.
</p>
        <a
          href="/dashboard"
          className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline"
        >
          Retour au tableau de bord
        </a>
      </main>
    );
  }

  const ownedCount = ownedMemberships?.length ?? 0;
  const quotaReached = ownedCount >= OWNER_COMPANY_LIMIT;
  const errorMessage =
  params.error &&
  Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, params.error)
    ? ERROR_MESSAGES[params.error]
    : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          PolyGest · Entreprises
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Créer une entreprise
        </h1>

        <p className="mt-2 text-slate-600">
          Ajoute un nouvel espace de gestion indépendant à ton compte.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 rounded-xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            Ton quota de création
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {ownedCount} entreprise{ownedCount > 1 ? "s" : ""} sur{" "}
            {OWNER_COMPANY_LIMIT} autorisées.
          </p>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-700"
              style={{
                width: `${Math.min(
                  100,
                  (ownedCount / OWNER_COMPANY_LIMIT) * 100,
                )}%`,
              }}
            />
          </div>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {errorMessage}
          </p>
        )}

        {quotaReached ? (
          <div>
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
            >
              Tu as atteint le maximum de cinq entreprises dont tu peux être
              propriétaire.
            </p>

            <p className="mt-3 text-sm text-slate-600">
              Contacte le support pour toute demande concernant cette limite.
            </p>
          </div>
        ) : (
          <form action={createAdditionalCompany} className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Raison sociale *
              <input
                name="legal_name"
                type="text"
                required
                minLength={2}
                maxLength={200}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Nom légal de l'entreprise"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Nom commercial
              <input
  name="trade_name"
  type="text"
  minLength={2}
  maxLength={200}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Nom utilisé commercialement"
              />
            </label>

            <p className="text-sm text-slate-500">
              Pays : Burkina Faso · Devise : XOF · Fuseau horaire :
              Africa/Ouagadougou
            </p>

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Créer mon entreprise
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          <a
            href="/dashboard"
            className="text-sm font-semibold text-slate-600 hover:text-blue-700"
          >
            ← Retour au tableau de bord
          </a>
        </div>
      </section>
    </main>
  );
}