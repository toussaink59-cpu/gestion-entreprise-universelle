import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "@/app/onboarding/actions";

export const instant = false;

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (!membershipError && memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <main style={{ maxWidth: 520, margin: "4rem auto", padding: "1.5rem" }}>
      <h1>Configurer ton entreprise</h1>
      <p>
        Renseigne les informations de ton entreprise pour créer ton espace de
        gestion.
      </p>

      {params.error === "missing-name" && (
        <p role="alert">La raison sociale est obligatoire.</p>
      )}

      {params.error === "invalid-name" && (
        <p role="alert">La raison sociale doit contenir entre 2 et 200 caracteres.</p>
      )}

      {params.error === "invalid-trade-name" && (
        <p role="alert">Le nom commercial doit contenir entre 2 et 200 caracteres.</p>
      )}

      {params.error === "creation-failed" && (
        <p role="alert">
          La création a échoué. Vérifie les données et les droits en base, puis
          réessaie.
        </p>
      )}

      <form action={createCompany}>
        <label style={{ display: "block", marginTop: "1rem" }}>
          Raison sociale
          <input
            name="legal_name"
            type="text"
            required
            maxLength={200}
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <label style={{ display: "block", marginTop: "1rem" }}>
          Nom commercial
          <input
            name="trade_name"
            type="text"
            maxLength={200}
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <p>
          Pays : Burkina Faso · Devise : XOF · Fuseau horaire : Africa/Ouagadougou
        </p>

        <button type="submit" style={{ marginTop: "1rem", padding: "0.7rem 1rem" }}>
          Créer mon entreprise
        </button>
      </form>
    </main>
  );
}