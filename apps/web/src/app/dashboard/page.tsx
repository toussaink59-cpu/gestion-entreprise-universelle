import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export const instant = false;

type ContactPreview = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
};

function DashboardFallback() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="animate-pulse space-y-4"
        aria-label="Chargement du tableau de bord"
      >
        <div className="h-8 w-56 rounded bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-100" />
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
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
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          Impossible de charger les appartenances à l’entreprise. Vérifie le
          schéma et les politiques d’accès Supabase.
        </p>
        <form action={signOut} className="mt-6">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            type="submit"
          >
            Se déconnecter
          </button>
        </form>
      </main>
    );
  }

  const companyIds = [
    ...new Set((memberships ?? []).map((membership) => membership.company_id)),
  ];

  if (companyIds.length === 0) redirect("/onboarding");

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, default_currency")
    .in("id", companyIds)
    .order("legal_name");

  // Charger des aperçus séparés par entreprise. Les requêtes restent soumises
  // à la RLS : un rôle sans permission de lecture ne reçoit aucune fiche.
  const contactPreviews = !companiesError && companies?.length
    ? await Promise.all(
        companies.map(async (company) => {
          const [customerResult, supplierResult] = await Promise.all([
            supabase
              .from("customers")
              .select("id, name, contact_name, email, phone")
              .eq("company_id", company.id)
              .eq("status", "active")
              .order("updated_at", { ascending: false })
              .limit(5),
            supabase
              .from("suppliers")
              .select("id, name, contact_name, email, phone")
              .eq("company_id", company.id)
              .eq("status", "active")
              .order("updated_at", { ascending: false })
              .limit(5),
          ]);

          if (customerResult.error) {
            console.error("Dashboard customer preview failed:", {
              code: customerResult.error.code,
            });
          }
          if (supplierResult.error) {
            console.error("Dashboard supplier preview failed:", {
              code: supplierResult.error.code,
            });
          }

          return {
            companyId: company.id,
            customers: (customerResult.data ?? []) as ContactPreview[],
            suppliers: (supplierResult.data ?? []) as ContactPreview[],
            customerError: Boolean(customerResult.error),
            supplierError: Boolean(supplierResult.error),
          };
        }),
      )
    : [];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            GestionPro
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Tableau de bord
          </h1>
          <p className="mt-2 text-slate-600">
            Bienvenue
            {user.user_metadata?.full_name
              ? `, ${String(user.user_metadata.full_name)}`
              : ""}
            .
          </p>
          <p className="mt-1 text-sm text-slate-500">Compte : {user.email}</p>
        </div>
        <form action={signOut}>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="submit"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Mes entreprises</h2>
        <p className="mt-1 text-sm text-slate-600">
          Chaque entreprise possède son propre répertoire clients et son propre
          répertoire fournisseurs.
        </p>
      </section>

      {companiesError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          Impossible de charger les informations des entreprises.
        </p>
      )}

      {!companiesError && companies && companies.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Aucune entreprise accessible pour le moment.
        </p>
      )}

      {companies && companies.length > 0 && (
        <div className="grid gap-6">
          {companies.map((company) => {
            const preview = contactPreviews.find(
              (item) => item.companyId === company.id,
            );
            const clientsUrl = `/dashboard/clients?company=${encodeURIComponent(company.id)}`;
            const suppliersUrl = `/dashboard/fournisseurs?company=${encodeURIComponent(company.id)}`;

            return (
              <article
                key={company.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      {company.trade_name || company.legal_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Raison sociale : {company.legal_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Devise : {company.default_currency}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Entreprise
                  </span>
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-2">
                  <ContactDirectoryPreview
                    title="Répertoire clients"
                    kind="customer"
                    contacts={preview?.customers ?? []}
                    hasError={preview?.customerError ?? false}
                    href={clientsUrl}
                  />
                  <ContactDirectoryPreview
                    title="Répertoire fournisseurs"
                    kind="supplier"
                    contacts={preview?.suppliers ?? []}
                    hasError={preview?.supplierError ?? false}
                    href={suppliersUrl}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function ContactDirectoryPreview({
  title,
  kind,
  contacts,
  hasError,
  href,
}: {
  title: string;
  kind: "customer" | "supplier";
  contacts: ContactPreview[];
  hasError: boolean;
  href: string;
}) {
  const singularLabel = kind === "customer" ? "client" : "fournisseur";

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-slate-900">{title}</h4>
        <span className="text-xs text-slate-500">5 fiches actives récentes max.</span>
      </div>

      {hasError ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          Impossible de charger les fiches de ce répertoire.
        </p>
      ) : contacts.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          Aucune fiche {singularLabel} active visible pour cette entreprise.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {contacts.map((contact) => (
            <li key={contact.id} className="px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {contact.name}
              </p>
              {contact.contact_name && (
                <p className="mt-0.5 truncate text-xs text-slate-600">
                  {contact.contact_name}
                </p>
              )}
              {(contact.email || contact.phone) && (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <a
          href={href}
          className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Ouvrir le répertoire
        </a>
      </div>
    </section>
  );
}
