"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";

type DashboardShellProps = { children: ReactNode };

const navigation = [
  { href: "/dashboard", key: "overview", exact: true },
  { href: "/dashboard/clients", key: "clients", exact: false },
  { href: "/dashboard/fournisseurs", key: "suppliers", exact: false },
  { href: "/dashboard/devis", key: "quotes", exact: false },
  { href: "/dashboard/depenses", key: "expenses", exact: false },
  { href: "/dashboard/membres", key: "members", exact: false },
] as const;

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const t = useTranslations("Dashboard.Navigation");

  return (
    <div className="min-h-screen bg-[var(--pg-canvas)] text-[var(--pg-text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--pg-border)] bg-[var(--pg-surface)] lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--pg-border)] px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-[var(--pg-text)]"><BrandLogo size={30}/></Link>
        </div>
        <nav aria-label={t("ariaLabel")} className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-xs font-medium text-[var(--pg-text-muted)]">{t("workspace")}</p>
          {navigation.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] ${active ? "bg-[var(--pg-surface-subtle)] text-[var(--pg-text)]" : "text-[var(--pg-text-muted)] hover:bg-[var(--pg-surface-subtle)] hover:text-[var(--pg-text)]"}`}>
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--pg-border)] px-6 py-4">
          <p className="text-xs text-[var(--pg-text-muted)]">{t("footer")}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[var(--pg-border)] bg-[var(--pg-surface)] lg:hidden">
          <div className="flex h-14 items-center px-4">
            <Link href="/dashboard" className="font-semibold tracking-tight text-[var(--pg-text)]"><BrandLogo size={26}/></Link>
          </div>
          <nav aria-label={t("ariaLabel")} className="flex gap-1 overflow-x-auto px-3 pb-3">
            {navigation.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                  className={`min-h-10 shrink-0 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] ${active ? "bg-[var(--pg-surface-subtle)] text-[var(--pg-text)]" : "text-[var(--pg-text-muted)] hover:bg-[var(--pg-surface-subtle)]"}`}>
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
