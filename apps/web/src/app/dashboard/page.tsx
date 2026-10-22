import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export const instant = false;

export default async function DashboardPage() {
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
    .eq("status", "active");

  if (membershipError) {
    return (
      <main style={{ maxWidth: 760, margin: "3rem auto", padding: "1.5rem" }}>
        <h1>Tableau de bord</h1>
        <p role="alert">
          Impossible de charger les appartenances à l&apos;entreprise. Vérifie le
          schéma et les politiques d&apos;accès Supabase.
        </p>
        <form action={signOut}>
          <button type="submit">Se déconnecter</button>
        </form>
      </main>
    );
  }

  const companyIds = [
    ...new Set((memberships ?? []).map((membership) => membership.company_id)),
  ];

  if (companyIds.length === 0) {
    redirect("/onboarding");
  }

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency")
    .in("id", companyIds);

  return (
    <main style={{ maxWidth: 760, margin: "3rem auto", padding: "1.5rem" }}>
      <h1>Tableau de bord</h1>
      <p>
        Bienvenue{user.user_metadata?.full_name
          ? `, ${String(user.user_metadata.full_name)}`
          : ""}
        .
      </p>
      <p>Compte : {user.email}</p>

      <h2>Mes entreprises</h2>

      {companiesError && (
        <p role="alert">Impossible de charger les informations des entreprises.</p>
      )}

      {!companiesError && companies && companies.length === 0 && (
        <p>Aucune entreprise accessible pour le moment.</p>
      )}

      {companies && companies.length > 0 && (
        <ul>
          {companies.map((company) => (
            <li key={company.id} style={{ marginBottom: "1rem" }}>
              <strong>{company.trade_name || company.legal_name}</strong>
              <div>Raison sociale : {company.legal_name}</div>
              <div>Devise : {company.default_currency}</div>
            </li>
          ))}
        </ul>
      )}

      <form action={signOut} style={{ marginTop: "2rem" }}>
        <button type="submit">Se déconnecter</button>
      </form>
    </main>
  );
}