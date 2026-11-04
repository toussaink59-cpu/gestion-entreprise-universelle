import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--pg-canvas)]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
        <aside className="flex flex-col justify-between border-b border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] px-6 py-7 sm:px-10 sm:py-9 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
          <Link
            href="/login"
            aria-label="PolyGest, accueil de connexion"
            className="inline-flex w-fit items-center rounded-sm text-xl font-semibold tracking-tight text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pg-focus)]"
          >
            PolyGest
          </Link>

          <div className="max-w-md py-8 lg:py-16">
            <p className="text-sm font-medium text-[var(--pg-accent)]">
              Gestion d’entreprise
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[var(--pg-text)] sm:text-4xl">
              Un espace de travail clair pour piloter votre activité.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-[var(--pg-text-muted)]">
              Retrouvez vos espaces d’entreprise et les outils de gestion
              associés à votre compte, avec des accès organisés par entreprise.
            </p>
          </div>

          <p className="text-sm text-[var(--pg-text-muted)]">
            PolyGest · Pour les entrepreneurs et les équipes.
          </p>
        </aside>

        <section
          aria-labelledby="auth-title"
          className="flex min-h-[32rem] items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:min-h-screen lg:px-14"
        >
          <div className="w-full max-w-md">
            <header className="mb-8">
              <p className="mb-3 text-sm font-medium text-[var(--pg-text-muted)]">
                Votre espace PolyGest
              </p>
              <h1
                id="auth-title"
                className="text-2xl font-semibold tracking-tight text-[var(--pg-text)] sm:text-3xl"
              >
                {title}
              </h1>
              <p className="mt-3 text-base leading-7 text-[var(--pg-text-muted)]">
                {description}
              </p>
            </header>

            {children}

            <div className="mt-8 border-t border-[var(--pg-border)] pt-5 text-sm text-[var(--pg-text-muted)]">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
