
import type { ReactNode } from "react";
import Link from "next/link";
import { localePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/locale";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { BrandLogo } from "@/components/ui/brand-logo";

type AuthRoute = "/login" | "/register" | "/forgot-password" | "/reset-password";

type AuthShellCopy = {
  homeLabel: string;
  languageLabel: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  locale,
  route,
  copy,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  locale: Locale;
  route: AuthRoute;
  copy: AuthShellCopy;
}) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#111a3b] px-4 py-8 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-36 h-[28rem] w-[28rem] rounded-full bg-[#3f65b8]/30 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#713b9c]/30 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#101936]/20 via-transparent to-[#0a2947]/40" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        <section
          aria-labelledby="auth-title"
          className="rounded-[28px] border border-white/70 bg-white px-6 py-7 shadow-[0_28px_90px_rgba(5,12,35,0.42)] sm:px-10 sm:py-9"
        >
          <div className="flex justify-end">
            <LocaleSwitcher locale={locale} href={route} label={copy.languageLabel} />
          </div>

          <div className="mt-2 flex justify-center">
            <Link
              href={localePath(locale, "/login")}
              aria-label={copy.homeLabel}
              className="inline-flex rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#087fa8]"
            >
              <BrandLogo size={40} className="text-2xl font-bold tracking-tight text-[#17233f]" />
            </Link>
          </div>

          <div className="mt-8 text-center">
            <h1 id="auth-title" className="text-[1.7rem] font-semibold tracking-tight text-[#18243e] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#667386]">{description}</p>
          </div>

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
