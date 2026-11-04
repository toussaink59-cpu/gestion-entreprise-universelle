import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

const INPUT_CLASS =
  "mt-2 block min-h-12 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none transition-colors placeholder:text-[var(--pg-text-muted)] focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function getLoginError(code: string | undefined): string | null {
  switch (code) {
    case "missing-fields":
      return "Renseigne ton adresse e-mail et ton mot de passe.";
    case "invalid-email":
      return "Le format de l’adresse e-mail est invalide.";
    case "password-too-long":
      return "Le mot de passe dépasse la longueur maximale autorisée.";
    case "email-not-confirmed":
      return "Cette adresse e-mail n’a pas encore été confirmée. Consulte le message reçu lors de ton inscription.";
    case "invalid-credentials":
      return "Adresse e-mail ou mot de passe incorrect.";
    case "confirmation-failed":
      return "Le lien de confirmation est invalide ou a expiré. Recommence la procédure d’inscription ou contacte l’assistance.";
    default:
      return code ? "La connexion n’a pas pu aboutir. Réessaie." : null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next ?? null);
  const error = getLoginError(params.error);

  return (
    <AuthShell
      title="Se connecter"
      description="Accède à ton espace de travail en renseignant les identifiants associés à ton compte."
      footer={
        <p>
          Tu n’as pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pg-focus)]"
          >
            Créer un compte
          </Link>
        </p>
      }
    >
      {params.message === "check-email" ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-6 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-4 text-sm leading-6 text-[var(--pg-text)]"
        >
          Si cette adresse peut être inscrite, un message de confirmation a été
          envoyé. Vérifie ta boîte de réception et tes courriers indésirables.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]"
        >
          {error}
        </p>
      ) : null}

      <form action={signIn} className="space-y-5">
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-semibold text-[var(--pg-text)]"
          >
            Adresse e-mail
          </label>
          <input
            id="login-email"
            className={INPUT_CLASS}
            type="email"
            name="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            placeholder="nom@entreprise.com"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-[var(--pg-text)]"
          >
            Mot de passe
          </label>
          <input
            id="login-password"
            className={INPUT_CLASS}
            type="password"
            name="password"
            autoComplete="current-password"
            maxLength={128}
            required
            placeholder="Ton mot de passe"
          />
        </div>

        <button type="submit" className={BUTTON_CLASS}>
          Se connecter
        </button>
      </form>
    </AuthShell>
  );
}
