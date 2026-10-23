import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canActivateMember,
  invitationRolesForActor,
  type MemberInvitationRole,
} from "@/lib/security/member-invitation-validation";
import { activateCompanyMember, inviteCompanyMember } from "./actions";

export const instant = false;

type SearchParams = Promise<{
  company?: string;
  error?: string;
  success?: string;
}>;

type CompanyRow = { id: string; legal_name: string; trade_name: string | null };
type CompanyMember = {
  membership_id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role_code: string;
  status: string;
  invited_by: string | null;
  created_at: string;
};

const INPUT_CLASS = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const BUTTON_CLASS = "inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
const SECONDARY_BUTTON_CLASS = "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

const ROLE_LABELS: Record<MemberInvitationRole, string> = {
  employee: "Employé",
  finance: "Finance",
  sales_purchasing: "Commercial / achats",
  auditor: "Auditeur",
  company_admin: "Administrateur d’entreprise",
  owner: "Propriétaire",
};

function roleLabel(value: string): string {
  return ROLE_LABELS[value as MemberInvitationRole] ?? value;
}

function statusLabel(value: string): string {
  if (value === "active") return "Actif";
  if (value === "invited") return "Invitation en attente";
  if (value === "revoked") return "Révoqué";
  return value;
}

function statusClass(value: string): string {
  if (value === "active") return "bg-emerald-50 text-emerald-700";
  if (value === "invited") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "invalid": return "Vérifie l’adresse e-mail, l’entreprise et le rôle sélectionné.";
    case "access": return "Cette entreprise n’est pas accessible avec ton compte.";
    case "permission": return "Ton rôle ne permet pas d’attribuer ce rôle ou de gérer les membres.";
    case "duplicate": return "Ce compte possède déjà une appartenance à cette entreprise.";
    case "no-account": return "Aucun compte actif n’a été trouvé pour cette adresse. La personne doit d’abord créer son compte GestionPro.";
    case "save": return "L’opération n’a pas pu être enregistrée. Vérifie les permissions puis réessaie.";
    case "not-found": return "Cette invitation n’est plus en attente ou n’est plus accessible.";
    default: return null;
  }
}

function successMessage(code: string | undefined): string | null {
  if (code === "invited") {
    return "L’invitation a été enregistrée. Aucun e-mail n’est envoyé automatiquement pour le moment.";
  }
  if (code === "activated") return "L’accès du membre a été activé.";
  return null;
}

function LoadingFallback() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Chargement des membres…
      </div>
    </main>
  );
}

export default function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MembersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MembersContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: membershipData, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id, role_code")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Impossible de vérifier les appartenances. Réessaie plus tard.</p><p className="mt-4"><a className="text-blue-700 hover:underline" href="/dashboard">Retour au tableau de bord</a></p></main>;
  }

  const memberships = membershipData ?? [];
  if (memberships.length === 0) redirect("/onboarding");
  const companyIds = [...new Set(memberships.map((item) => item.company_id))];

  const { data: companyData, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .in("id", companyIds)
    .order("legal_name");

  if (companiesError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Impossible de charger les entreprises accessibles.</p></main>;
  }

  const companies = (companyData ?? []) as CompanyRow[];
  if (companies.length === 0) redirect("/onboarding");

  let selectedCompanyId: string | null = null;
  if (params.company) {
    selectedCompanyId = companyIds.includes(params.company) ? params.company : null;
  } else if (companies.length === 1) {
    selectedCompanyId = companies[0].id;
  }

  const currentError = errorMessage(params.error);
  const currentSuccess = successMessage(params.success);

  if (!selectedCompanyId) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-widest text-blue-700">GestionPro · Équipe</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Membres et accès</h1><p className="mt-2 text-slate-600">Sélectionne l’entreprise concernée.</p></div>
          <a href="/dashboard" className={SECONDARY_BUTTON_CLASS}>Tableau de bord</a>
        </header>
        {params.company && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Cette entreprise n’est pas accessible avec ton compte.</p>}
        {currentError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{currentError}</p>}
        {currentSuccess && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{currentSuccess}</p>}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mes entreprises</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {companies.map((company) => (
              <a key={company.id} href={`/dashboard/membres?company=${encodeURIComponent(company.id)}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-400 hover:bg-blue-50">
                <span className="block font-semibold text-slate-900">{company.trade_name || company.legal_name}</span>
                <span className="mt-1 block text-sm text-slate-600">{company.legal_name}</span>
                <span className="mt-3 inline-block text-sm font-semibold text-blue-700">Gérer les membres →</span>
              </a>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const company = companies.find((item) => item.id === selectedCompanyId);
  const membership = memberships.find((item) => item.company_id === selectedCompanyId);
  if (!company || !membership) redirect("/dashboard");

  const actorRole = String(membership.role_code);
  const invitationRoles = invitationRolesForActor(actorRole);
  const canInvite = invitationRoles.length > 0;
  const { data: memberData, error: membersError } = await supabase.rpc("list_company_members", {
    p_company_id: selectedCompanyId,
  });
  if (membersError) {
    console.error("Company member list failed:", { code: membersError.code });
  }
  const members = (memberData ?? []) as CompanyMember[];
  const memberListError = membersError
    ? membersError.code === "42501"
      ? "Ton rôle ne permet pas de consulter la liste des membres de cette entreprise."
      : "Impossible de charger les membres. Réessaie plus tard."
    : null;
  const companyQuery = `?company=${encodeURIComponent(selectedCompanyId)}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">GestionPro · Équipe</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Membres et accès</h1>
          <p className="mt-2 text-slate-600">{company.trade_name || company.legal_name}<span className="mx-2 text-slate-300">/</span>Consultation des accès et invitations.</p>
          <p className="mt-1 text-sm text-slate-500">Ton rôle : {roleLabel(actorRole)}</p>
        </div>
        <nav aria-label="Navigation du module" className="flex flex-wrap gap-2">
          <a href="/dashboard" className={SECONDARY_BUTTON_CLASS}>Tableau de bord</a>
          <a href={`/dashboard/clients${companyQuery}`} className={SECONDARY_BUTTON_CLASS}>Clients</a>
          <a href={`/dashboard/fournisseurs${companyQuery}`} className={SECONDARY_BUTTON_CLASS}>Fournisseurs</a>
          {companies.length > 1 && <a href="/dashboard/membres" className={SECONDARY_BUTTON_CLASS}>Changer d’entreprise</a>}
        </nav>
      </header>

      {currentError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{currentError}</p>}
      {currentSuccess && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{currentSuccess}</p>}

      {canInvite && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><h2 className="text-xl font-semibold text-slate-900">Inviter un compte existant</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">Saisis l’adresse e-mail d’un utilisateur déjà inscrit sur GestionPro et choisis son rôle. L’invitation sera créée en attente ; le propriétaire pourra activer l’accès après vérification.</p></div>
          <form action={inviteCompanyMember} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="company_id" value={selectedCompanyId} />
            <label className="text-sm font-medium text-slate-700">Adresse e-mail *<input className={INPUT_CLASS} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="nom@entreprise.com" /></label>
            <label className="text-sm font-medium text-slate-700">Rôle à attribuer *<select className={INPUT_CLASS} name="role_code" required defaultValue="employee">{invitationRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
            <div className="flex items-end"><button type="submit" className={BUTTON_CLASS}>Créer l’invitation</button></div>
          </form>
          {actorRole === "owner" && <p className="mt-4 text-xs text-slate-500">Les rôles Propriétaire et Administrateur donnent des droits étendus. Attribue-les uniquement à des personnes de confiance.</p>}
          <p className="mt-2 text-xs text-slate-500">Aucun e-mail n’est envoyé automatiquement pour le moment ; cette page enregistre l’invitation dans GestionPro.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="text-xl font-semibold text-slate-900">Membres de l’entreprise</h2><p className="mt-1 text-sm text-slate-600">Les invitations en attente restent distinctes des accès actifs.</p></div>
        {memberListError ? (
          <p role="alert" className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">{memberListError}</p>
        ) : members.length === 0 ? (
          <div className="p-10 text-center"><p className="font-semibold text-slate-800">Aucun membre à afficher</p><p className="mt-1 text-sm text-slate-500">La liste de cette entreprise est actuellement vide.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Membre</th><th className="px-5 py-3 font-semibold">Rôle</th><th className="px-5 py-3 font-semibold">Statut</th><th className="px-5 py-3 font-semibold">Ajouté le</th><th className="px-5 py-3 font-semibold">Action</th></tr></thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.membership_id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{member.full_name || member.email || "Utilisateur GestionPro"}</p><p className="mt-1 text-xs text-slate-500">{member.email || `ID utilisateur : ${member.user_id}`}</p></td>
                    <td className="px-5 py-4 text-slate-700">{roleLabel(member.role_code)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(member.status)}`}>{statusLabel(member.status)}</span></td>
                    <td className="px-5 py-4 text-slate-600">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(member.created_at))}</td>
                    <td className="px-5 py-4">
                      {canActivateMember(actorRole) && member.status === "invited" ? (
                        <form action={activateCompanyMember}>
                          <input type="hidden" name="company_id" value={selectedCompanyId} />
                          <input type="hidden" name="membership_id" value={member.membership_id} />
                          <button type="submit" className="text-sm font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900">Activer l’accès</button>
                        </form>
                      ) : member.status === "invited" ? (
                        <span className="text-xs text-slate-500">Propriétaire requis</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <footer className="mt-8 text-sm text-slate-500">L’accès aux membres et la création des invitations sont revérifiés par les fonctions SQL et les politiques de sécurité Supabase.</footer>
    </main>
  );
}