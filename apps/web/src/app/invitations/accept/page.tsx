import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidInvitationToken } from "@/lib/email/member-invitation";
import { confirmCompanyInvitation } from "../actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Confirmer une invitation · GestionPro",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string; success?: string; error?: string }>;

export default async function AcceptInvitationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  if (params.success === "confirmed") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Adresse confirmée</h1>
          <p className="mt-4 text-slate-700">Ton invitation a été confirmée. Le propriétaire doit encore vérifier puis activer ton accès à l’entreprise.</p>
          <p className="mt-6"><a className="font-semibold text-blue-700 underline" href="/login">Retour à la connexion</a></p>
        </section>
      </main>
    );
  }
  if (params.error || !params.token || !isValidInvitationToken(params.token)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Lien d’invitation invalide</h1>
          <p className="mt-4 text-slate-700">Ce lien a peut-être expiré, a déjà été utilisé ou ne correspond pas au compte connecté. Demande à l’entreprise de renvoyer l’invitation.</p>
          <p className="mt-6"><a className="font-semibold text-blue-700 underline" href="/login">Se connecter</a></p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(`/invitations/accept?token=${params.token}`)}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">GestionPro · Équipe</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Confirmer ton invitation</h1>
        <p className="mt-4 text-slate-700">Tu es connecté en tant que <strong>{user.email ?? "compte GestionPro"}</strong>. Confirme que tu as accès à cette adresse e-mail. Le lien est à usage unique et expire après sept jours.</p>
        <p className="mt-3 text-sm text-slate-600">Cette confirmation ne donne pas immédiatement accès à l’entreprise : le propriétaire devra encore activer ton appartenance.</p>
        <form action={confirmCompanyInvitation} className="mt-6">
          <input type="hidden" name="token" value={params.token} />
          <button type="submit" className="inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Confirmer l’invitation</button>
        </form>
      </section>
    </main>
  );
}
