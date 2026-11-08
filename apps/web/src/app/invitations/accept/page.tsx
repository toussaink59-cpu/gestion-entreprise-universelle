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
        <section className="rounded-lg border border-[#D2E2D7] bg-[var(--pg-surface)] p-8">
          <h1 className="text-2xl font-bold text-[var(--pg-text)]">{t("confirmedTitle")}</h1>
          <p className="mt-4 text-[var(--pg-text)]">{t("confirmedDescription")}</p>
          <p className="mt-6"><a className="font-semibold text-[var(--pg-accent)] underline" href={loginPath}>{t("backToLogin")}</a></p>
        </section>
      </main>
    );
  }

  if (params.error || !params.token || !isValidInvitationToken(params.token)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-lg border border-[#EADFC0] bg-[var(--pg-surface)] p-8">
          <h1 className="text-2xl font-bold text-[var(--pg-text)]">{t("invalidTitle")}</h1>
          <p className="mt-4 text-[var(--pg-text)]">{t("invalidDescription")}</p>
          <p className="mt-6"><a className="font-semibold text-[var(--pg-accent)] underline" href={loginPath}>{t("login")}</a></p>
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
      <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-8">
        <p className="text-sm font-semibold  text-[var(--pg-accent)]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--pg-text)]">{t("confirmTitle")}</h1>
        <p className="mt-4 text-[var(--pg-text)]">{t("signedInAs")} <strong>{user.email ?? t("accountFallback")}</strong>. {t("confirmAccess")} {t("oneTimeExpiry")}</p>
        <p className="mt-3 text-sm text-[var(--pg-text-muted)]">{t("ownerActivationNotice")}</p>
        <form action={confirmCompanyInvitation} className="mt-6">
          <input type="hidden" name="token" value={params.token} />
          <button type="submit" className="inline-flex rounded-lg bg-[var(--pg-accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">{t("confirmButton")}</button>
        </form>
      </section>
    </main>
  );
}
