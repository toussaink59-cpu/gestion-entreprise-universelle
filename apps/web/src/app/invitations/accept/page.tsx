import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isValidInvitationToken } from "@/lib/email/member-invitation";
import { invitationAcceptPath } from "@/lib/email/invitation-link";
import { localePath, type Locale } from "@/i18n/locale";
import { confirmCompanyInvitation } from "../actions";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invitations.Accept");
  return {
    title: t("metadataTitle"),
    referrer: "no-referrer",
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{ token?: string; success?: string; error?: string }>;

export default async function AcceptInvitationPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("Invitations.Accept"),
  ]);
  const currentLocale = locale as Locale;
  const loginPath = localePath(currentLocale, "/login");

  if (params.success === "confirmed") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">{t("confirmedTitle")}</h1>
          <p className="mt-4 text-slate-700">{t("confirmedDescription")}</p>
          <p className="mt-6"><a className="font-semibold text-blue-700 underline" href={loginPath}>{t("backToLogin")}</a></p>
        </section>
      </main>
    );
  }

  if (params.error || !params.token || !isValidInvitationToken(params.token)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">{t("invalidTitle")}</h1>
          <p className="mt-4 text-slate-700">{t("invalidDescription")}</p>
          <p className="mt-6"><a className="font-semibold text-blue-700 underline" href={loginPath}>{t("login")}</a></p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const nextPath = invitationAcceptPath(params.token, currentLocale);
    redirect(`${loginPath}?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">{t("eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">{t("confirmTitle")}</h1>
        <p className="mt-4 text-slate-700">{t("signedInAs")} <strong>{user.email ?? t("accountFallback")}</strong>. {t("confirmAccess")} {t("oneTimeExpiry")}</p>
        <p className="mt-3 text-sm text-slate-600">{t("ownerActivationNotice")}</p>
        <form action={confirmCompanyInvitation} className="mt-6">
          <input type="hidden" name="token" value={params.token} />
          <button type="submit" className="inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{t("confirmButton")}</button>
        </form>
      </section>
    </main>
  );
}
