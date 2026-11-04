import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createContact, setContactStatus, updateContact } from "@/app/dashboard/contacts/actions";
import { DocumentAttachments } from "./document-attachments";
import { createClient } from "@/lib/supabase/server";
import type { BusinessContactKind } from "@/lib/security/business-contact-validation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type PageSearchParams = Promise<{
  company?: string;
  q?: string;
  status?: string;
  error?: string;
  success?: string;
}>;

type ContactRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tax_identifier: string | null;
  address: string | null;
  city: string | null;
  country_code: string;
  payment_terms_days: number;
  notes: string | null;
  status: "active" | "archived";
  updated_at: string;
};

type CompanyRow = {
  id: string;
  legal_name: string;
  trade_name: string | null;
};

const INPUT_CLASS = "mt-1 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const BUTTON_CLASS = "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const SECONDARY_BUTTON_CLASS = "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const READ_ROLES = new Set(["owner", "company_admin", "finance", "sales_purchasing", "auditor"]);
const WRITE_ROLES = new Set(["owner", "company_admin", "sales_purchasing"]);

function routeFor(kind: BusinessContactKind): string {
  return kind === "customer" ? "/dashboard/clients" : "/dashboard/fournisseurs";
}

function labelFor(kind: BusinessContactKind): string {
  return kind === "customer" ? "client" : "fournisseur";
}

function pluralLabelFor(kind: BusinessContactKind): string {
  return kind === "customer" ? "Clients" : "Fournisseurs";
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "access":
      return "Accès à cette entreprise impossible. Vérifie ton appartenance et réessaie.";
    case "invalid":
      return "Certaines informations sont invalides. Vérifie les champs et leurs longueurs.";
    case "save":
      return "L’opération a été refusée ou a échoué. Vérifie tes permissions et les informations saisies.";
    case "not-found":
      return "Cette fiche n’est plus accessible ou ton rôle ne permet pas de la modifier.";
    default:
      return null;
  }
}

function successMessage(code: string | undefined): string | null {
  switch (code) {
    case "created":
      return "La fiche a été créée.";
    case "updated":
      return "Les modifications ont été enregistrées.";
    case "archived":
      return "La fiche a été archivée. Elle reste conservée dans l’historique.";
    case "restored":
      return "La fiche a été réactivée.";
    default:
      return null;
  }
}

function ContactFields({ contact }: { contact?: ContactRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium text-slate-700">
        Nom / raison sociale *
        <input className={INPUT_CLASS} name="name" required minLength={2} maxLength={200} defaultValue={contact?.name ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Personne à contacter
        <input className={INPUT_CLASS} name="contact_name" maxLength={150} defaultValue={contact?.contact_name ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Adresse e-mail
        <input className={INPUT_CLASS} name="email" type="email" maxLength={254} defaultValue={contact?.email ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Téléphone
        <input className={INPUT_CLASS} name="phone" type="tel" maxLength={40} defaultValue={contact?.phone ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Identifiant fiscal
        <input className={INPUT_CLASS} name="tax_identifier" maxLength={100} defaultValue={contact?.tax_identifier ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Ville
        <input className={INPUT_CLASS} name="city" maxLength={120} defaultValue={contact?.city ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
        Adresse
        <input className={INPUT_CLASS} name="address" maxLength={250} defaultValue={contact?.address ?? ""} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Code pays (ISO)
        <input className={INPUT_CLASS} name="country_code" required minLength={2} maxLength={2} defaultValue={contact?.country_code ?? "BF"} />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Délai de paiement (jours)
        <input className={INPUT_CLASS} name="payment_terms_days" type="number" min={0} max={365} step={1} defaultValue={contact?.payment_terms_days ?? 0} />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
        Notes internes
        <textarea className={INPUT_CLASS} name="notes" rows={3} maxLength={2000} defaultValue={contact?.notes ?? ""} />
      </label>
    </div>
  );
}

function CompanyChooser({ companies, kind }: { companies: CompanyRow[]; kind: BusinessContactKind }) {
  return (
    <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Choisir une entreprise</h2>
      <p className="mt-1 text-sm text-[var(--pg-text-muted)]">Les répertoires sont séparés pour chaque entreprise.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {companies.map((company) => (
          <a key={company.id} href={`${routeFor(kind)}?company=${encodeURIComponent(company.id)}`} className="rounded-md border border-[var(--pg-border)] p-4 hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">
            <span className="block font-semibold text-[var(--pg-text)]">{company.trade_name || company.legal_name}</span>
            <span className="mt-1 block text-sm text-[var(--pg-text-muted)]">{company.legal_name}</span>
            <span className="mt-3 inline-block text-sm font-medium text-[var(--pg-accent)]">Ouvrir le répertoire →</span>
          </a>
        ))}
      </div>
      <p className="mt-5 text-sm"><a className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline" href="/dashboard">Retour au tableau de bord</a></p>
    </section>
  );
}

export async function ContactsPage({ kind, searchParams }: { kind: BusinessContactKind; searchParams: PageSearchParams }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id, role_code")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm text-[var(--pg-text)]">Impossible de vérifier les appartenances à l’entreprise. Réessaie plus tard.</p><p className="mt-4"><a href="/dashboard" className="text-blue-700 hover:underline">Retour au tableau de bord</a></p></main>;
  }

  const membershipRows = memberships ?? [];
  if (membershipRows.length === 0) redirect("/onboarding");

  const companyIds = [...new Set(membershipRows.map((membership) => membership.company_id))];
  const { data: companyData, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .in("id", companyIds)
    .order("legal_name");

  if (companiesError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm text-[var(--pg-text)]">Impossible de charger les entreprises accessibles.</p></main>;
  }
  const companies = (companyData ?? []) as CompanyRow[];
  if (companies.length === 0) redirect("/onboarding");

  let selectedCompanyId: string | null = null;
  if (params.company) {
    selectedCompanyId = companyIds.includes(params.company) ? params.company : null;
  } else if (companies.length === 1) {
    selectedCompanyId = companies[0].id;
  }

  const pageTitle = pluralLabelFor(kind);
  const singularLabel = labelFor(kind);
  const baseRoute = routeFor(kind);
  const currentError = errorMessage(params.error);
  const currentSuccess = successMessage(params.success);

  if (!selectedCompanyId) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="PolyGest · Répertoires"
          title={pageTitle}
          description="Sélectionne l’entreprise concernée pour continuer."
          actions={<a href="/dashboard" className={SECONDARY_BUTTON_CLASS}>Tableau de bord</a>}
        />
        {params.company && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Cette entreprise n’est pas accessible avec ton compte.</p>}
        {currentError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{currentError}</p>}
        {currentSuccess && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{currentSuccess}</p>}
        <CompanyChooser companies={companies} kind={kind} />
      </main>
    );
  }

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const membership = membershipRows.find((row) => row.company_id === selectedCompanyId);
  if (!selectedCompany || !membership) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm text-[var(--pg-text)]">Cette entreprise n’est pas accessible avec ton compte.</p><p className="mt-4"><a href={baseRoute} className="text-blue-700 hover:underline">Choisir une autre entreprise</a></p></main>;
  }

  const roleCode = String(membership.role_code);
  const canRead = READ_ROLES.has(roleCode);
  const canWrite = WRITE_ROLES.has(roleCode);
  const statusFilter = params.status === "all" || params.status === "archived" ? params.status : "active";
  const queryText = (params.q ?? "").trim().slice(0, 80);
  let contacts: ContactRow[] = [];
  let contactsError: string | null = null;

  if (canRead) {
    let query = supabase
      .from(kind === "customer" ? "customers" : "suppliers")
      .select("id, name, contact_name, email, phone, tax_identifier, address, city, country_code, payment_terms_days, notes, status, updated_at")
      .eq("company_id", selectedCompanyId)
      .order("name", { ascending: true })
      .limit(100);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (queryText) query = query.ilike("name", `%${queryText}%`);

    const { data, error } = await query;
    if (error) {
      console.error("Business contact list failed:", { code: error.code });
      contactsError = "Impossible de charger les fiches. Réessaie ou vérifie les permissions.";
    } else {
      contacts = (data ?? []) as ContactRow[];
    }
  }

  const otherRoute = kind === "customer" ? "/dashboard/fournisseurs" : "/dashboard/clients";
  const otherLabel = kind === "customer" ? "Fournisseurs" : "Clients";
  const companyQuery = `?company=${encodeURIComponent(selectedCompanyId)}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Répertoires"
        title={pageTitle}
        description={`${selectedCompany.trade_name || selectedCompany.legal_name} · Gestion des coordonnées et des conditions de paiement.`}
        actions={
          <nav aria-label="Navigation du module" className="flex flex-wrap gap-2">
            <a href="/dashboard" className={SECONDARY_BUTTON_CLASS}>Tableau de bord</a>
            <a href={`${otherRoute}${companyQuery}`} className={SECONDARY_BUTTON_CLASS}>{otherLabel}</a>
            {companies.length > 1 && <a href={baseRoute} className={SECONDARY_BUTTON_CLASS}>Changer d’entreprise</a>}
          </nav>
        }
      />

      {currentError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{currentError}</p>}
      {currentSuccess && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{currentSuccess}</p>}

      {!canRead ? (
        <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-5 text-[var(--pg-text)]">
          <h2 className="font-semibold">Consultation non autorisée</h2>
          <p className="mt-1 text-sm">Le rôle associé à cette entreprise ne donne pas accès au répertoire {singularLabel}. Demande au propriétaire de vérifier tes permissions.</p>
        </section>
      ) : (
        <>
          {canWrite && (
            <section className="mb-8 border-b border-[var(--pg-border)] pb-6">
              <div className="mb-5"><h2 className="text-lg font-semibold text-[var(--pg-text)]">Ajouter un {singularLabel}</h2><p className="mt-1 text-sm text-[var(--pg-text-muted)]">Les champs marqués d’un astérisque sont obligatoires.</p></div>
              <form action={createContact} className="space-y-5">
                <input type="hidden" name="contact_kind" value={kind} />
                <input type="hidden" name="company_id" value={selectedCompanyId} />
                <ContactFields />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pg-border)] pt-4">
                  <p className="text-xs text-[var(--pg-text-muted)]">La suppression définitive n’est pas proposée ; les fiches peuvent être archivées.</p>
                  <button type="submit" className={BUTTON_CLASS}>Créer la fiche</button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--pg-border)] p-5 sm:p-6">
              <div><h2 className="text-lg font-semibold text-[var(--pg-text)]">Répertoire</h2><p className="mt-1 text-sm text-[var(--pg-text-muted)]">Recherche par nom, avec filtrage des fiches actives et archivées.</p></div>
              <form method="get" action={baseRoute} className="flex w-full flex-wrap gap-2 sm:w-auto">
                <input type="hidden" name="company" value={selectedCompanyId} />
                <label className="sr-only" htmlFor="contact-search">Rechercher un nom</label>
                <input id="contact-search" className="min-h-11 min-w-48 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]" type="search" name="q" maxLength={80} placeholder="Rechercher un nom…" defaultValue={queryText} />
                <label className="sr-only" htmlFor="contact-status">Statut</label>
                <select id="contact-status" name="status" className="min-h-11 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]" defaultValue={statusFilter}>
                  <option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous</option>
                </select>
                <button className={SECONDARY_BUTTON_CLASS} type="submit">Filtrer</button>
              </form>
            </div>

            {contactsError ? (
              <p role="alert" className="m-5 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm text-[var(--pg-text)]">{contactsError}</p>
            ) : contacts.length === 0 ? (
              <div className="p-5 sm:p-6"><EmptyState title="Aucune fiche à afficher" description="Modifie les filtres ou ajoute une première fiche si ton rôle le permet." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]"><tr><th className="px-5 py-3 font-semibold">Nom</th><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Coordonnées</th><th className="px-5 py-3 font-semibold">Ville</th><th className="px-5 py-3 font-semibold">Statut</th><th className="px-5 py-3 font-semibold">Pièces jointes</th><th className="px-5 py-3 font-semibold">Actions</th></tr></thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-t border-[var(--pg-border)] align-top hover:bg-[var(--pg-surface-subtle)]">
                        <td className="px-5 py-4"><p className="font-semibold text-[var(--pg-text)]">{contact.name}</p>{contact.tax_identifier && <p className="mt-1 text-xs text-[var(--pg-text-muted)]">ID fiscal : {contact.tax_identifier}</p>}</td>
                        <td className="px-5 py-4 text-[var(--pg-text)]">{contact.contact_name || <span className="text-[var(--pg-text-muted)]">—</span>}</td>
                        <td className="px-5 py-4"><div className="text-[var(--pg-text)]">{contact.email || "—"}</div><div className="mt-1 text-xs text-[var(--pg-text-muted)]">{contact.phone || "—"}</div></td>
                        <td className="px-5 py-4 text-[var(--pg-text)]">{contact.city || "—"}</td>
                        <td className="px-5 py-4"><span className={contact.status === "active" ? "rounded-md bg-[var(--pg-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--pg-text)]" : "rounded-md bg-[var(--pg-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--pg-text-muted)]"}>{contact.status === "active" ? "Actif" : "Archivé"}</span></td>
                        <td className="px-5 py-4"><DocumentAttachments companyId={selectedCompanyId} moduleCode={kind === "customer" ? "customers" : "suppliers"} entityType={kind} entityId={contact.id} canUpload={canWrite && process.env.DOCUMENT_SCANNER_ENABLED === "true"} scannerEnabled={process.env.DOCUMENT_SCANNER_ENABLED === "true"} /></td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-40 flex-col items-start gap-3">
                            {canWrite && <details className="w-full"><summary className="cursor-pointer font-medium text-[var(--pg-accent)] hover:underline">Modifier</summary><form action={updateContact} className="mt-3 min-w-72 space-y-4 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4">
                              <input type="hidden" name="contact_kind" value={kind} /><input type="hidden" name="company_id" value={selectedCompanyId} /><input type="hidden" name="contact_id" value={contact.id} />
                              <ContactFields contact={contact} /><button type="submit" className={BUTTON_CLASS}>Enregistrer</button>
                            </form></details>}
                            {canWrite && <form action={setContactStatus}>
                              <input type="hidden" name="contact_kind" value={kind} /><input type="hidden" name="company_id" value={selectedCompanyId} /><input type="hidden" name="contact_id" value={contact.id} />
                              <input type="hidden" name="status" value={contact.status === "active" ? "archived" : "active"} />
                              <button type="submit" className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--pg-text)] underline underline-offset-4 hover:text-[var(--pg-accent)]">{contact.status === "active" ? "Archiver" : "Réactiver"}</button>
                            </form>}
                            {!canWrite && <span className="text-xs text-[var(--pg-text-muted)]">Lecture seule</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {contacts.length === 100 && <p className="border-t border-[var(--pg-border)] px-5 py-3 text-xs text-[var(--pg-text-muted)]">100 fiches maximum affichées. Affine la recherche pour retrouver une fiche plus précise.</p>}
          </section>
        </>
      )}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pg-border)] pt-5 text-sm text-[var(--pg-text-muted)]"><span>Les accès sont contrôlés par les permissions de l’entreprise et la sécurité RLS de Supabase.</span><a href="/dashboard" className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline">Retour au tableau de bord</a></footer>
    </main>
  );
}
