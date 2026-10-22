import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-950">Tableau de bord</h1>
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Impossible de charger les appartenances à l’entreprise. Vérifie le schéma et les politiques d’accès Supabase.
        </p>
        <form action={signOut} className="mt-6"><button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="submit">Se déconnecter</button></form>
      </main>
    );
  }

  const companyIds = [...new Set((memberships ?? []).map((membership) => membership.company_id))];
  if (companyIds.length === 0) redirect("/onboarding");

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency")
    .in("id", companyIds)
    .order("legal_name");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">GestionPro</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tableau de bord</h1>
          <p className="mt-2 text-slate-600">Bienvenue{user.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name)}` : ""}.</p>
          <p className="mt-1 text-sm text-slate-500">Compte : {user.email}</p>
        </div>
        <form action={signOut}><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="submit">Se déconnecter</button></form>
      </header>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Mes entreprises</h2>
        <p className="mt-1 text-sm text-slate-600">Choisis l’entreprise concernée avant d’ouvrir un répertoire.</p>
      </section>

      {companiesError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Impossible de charger les informations des entreprises.</p>}
      {!companiesError && companies && companies.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Aucune entreprise accessible pour le moment.</p>}

      {companies && companies.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {companies.map((company) => (
            <article key={company.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="text-lg font-semibold text-slate-950">{company.trade_name || company.legal_name}</h3><p className="mt-1 text-sm text-slate-600">Raison sociale : {company.legal_name}</p><p className="mt-1 text-xs text-slate-500">Devise : {company.default_currency}</p></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Entreprise</span>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700">Gestion commerciale</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`/dashboard/clients?company=${encodeURIComponent(company.id)}`} className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Ouvrir les clients</a>
                  <a href={`/dashboard/fournisseurs?company=${encodeURIComponent(company.id)}`} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ouvrir les fournisseurs</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
