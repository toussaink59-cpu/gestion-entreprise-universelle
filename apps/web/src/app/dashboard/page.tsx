import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

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
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="PolyGest" title="Tableau de bord" description="Chargement de vos espaces de travail…" />
      <div role="status" aria-label="Chargement du tableau de bord" className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-[var(--pg-surface-subtle)]" />
        <div className="h-40 animate-pulse rounded-lg bg-[var(--pg-surface-subtle)]" />
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
    .select("company_id, role_code")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <PageHeader eyebrow="PolyGest" title="Tableau de bord" />
        <p role="alert" className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]">
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
      <PageHeader
        eyebrow="PolyGest · Espace de travail"
        title="Tableau de bord"
        description={`Bienvenue${user.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name)}` : ""}. Compte : ${user.email ?? "adresse non renseignée"}.`}
        actions={
          <>
            <a href="/dashboard/entreprises/nouvelle" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">
              Créer une entreprise
            </a>
            <form action={signOut}>
              <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-4 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]" type="submit">
                Se déconnecter
              </button>
            </form>
          </>
        }
      />

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--pg-text)]">Mes entreprises</h2>
        <p className="mt-1 text-sm text-[var(--pg-text-muted)]">Chaque entreprise dispose de ses propres répertoires clients et fournisseurs.</p>
      </section>

      {companiesError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text)]"
        >
          Impossible de charger les informations des entreprises.
        </p>
      )}

      {!companiesError && companies && companies.length === 0 && (
        <EmptyState
          title="Aucune entreprise accessible"
          description="Créez une entreprise ou demandez à son propriétaire de vous inviter pour commencer."
          action={<a href="/dashboard/entreprises/nouvelle" className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">Créer une entreprise</a>}
        />
      )}

      {companies && companies.length > 0 && (
        <div className="grid gap-6">
          {companies.map((company) => {
            const membership = (memberships ?? []).find(
              (item) => item.company_id === company.id,
            );
            const canManageMembers = ["owner", "company_admin"].includes(
              String(membership?.role_code ?? ""),
            );
            const preview = contactPreviews.find(
              (item) => item.companyId === company.id,
            );
            const clientsUrl = `/dashboard/clients?company=${encodeURIComponent(company.id)}`;
            const suppliersUrl = `/dashboard/fournisseurs?company=${encodeURIComponent(company.id)}`;

            return (
              <article
                key={company.id}
                className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      {company.trade_name || company.legal_name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--pg-text-muted)]">
                      Raison sociale : {company.legal_name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--pg-text-muted)]">
                      Devise : {company.default_currency}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--pg-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--pg-text-muted)]">
                      Entreprise
                    </span>
                    {canManageMembers && (
                      <a
                        href={`/dashboard/membres?company=${encodeURIComponent(company.id)}`}
                        className="inline-flex min-h-9 items-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-1 text-xs font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
                      >
                        Gérer les membres
                      </a>
                    )}
                  </div>
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
    <section className="min-w-0 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-[var(--pg-text)]">{title}</h4>
        <span className="text-xs text-[var(--pg-text-muted)]">5 fiches actives récentes max.</span>
      </div>

      {hasError ? (
        <p role="alert" className="mt-4 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-3 text-sm text-[var(--pg-text)]">
          Impossible de charger les fiches de ce répertoire.
        </p>
      ) : contacts.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-[var(--pg-border)] bg-[var(--pg-surface)] p-4 text-sm text-[var(--pg-text-muted)]">
          Aucune fiche {singularLabel} active visible pour cette entreprise.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--pg-border)] rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)]">
          {contacts.map((contact) => (
            <li key={contact.id} className="px-4 py-3">
              <p className="truncate text-sm font-semibold text-[var(--pg-text)]">
                {contact.name}
              </p>
              {contact.contact_name && (
                <p className="mt-0.5 truncate text-xs text-[var(--pg-text-muted)]">
                  {contact.contact_name}
                </p>
              )}
              {(contact.email || contact.phone) && (
                <p className="mt-1 truncate text-xs text-[var(--pg-text-muted)]">
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
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]"
        >
          Ouvrir le répertoire
        </a>
      </div>
    </section>
  );
}
