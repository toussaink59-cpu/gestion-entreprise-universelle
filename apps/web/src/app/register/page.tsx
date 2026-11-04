import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";

export const instant = false;

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const INPUT_CLASS =
  "mt-2 block min-h-12 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none transition-colors placeholder:text-[var(--pg-text-muted)] focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

function getRegisterError(code: string | undefined): string | null {
  switch (code) {
    case "missing-fields":
      return "Tous les champs sont obligatoires.";
    case "invalid-name":
      return "Le nom complet doit contenir entre 2 et 100 caractères.";
    case "invalid-email":
      return "Le format de l’adresse e-mail est invalide.";
    case "password-too-long":
      return "Le mot de passe ne doit pas dépasser 128 caractères.";
    case "password-too-short":
      return "Le mot de passe doit contenir au moins 8 caractères.";
    case "signup-failed":
      return "Impossible de créer le compte. Vérifie les informations et réessaie.";
    default:
      return code ? "L’inscription n’a pas pu aboutir. Réessaie." : null;
  }
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const error = getRegisterError(params.error);

  return (
    <AuthShell
      title="Créer un compte"
      description="Crée ton accès PolyGest pour configurer ton premier espace d’entreprise."
      footer={
        <p>
          Tu as déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--pg-accent)] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pg-focus)]"
          >
            Se connecter
          </Link>
        </p>
      }
    >
      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm leading-6 text-[#963F3F]"
        >
          {error}
        </p>
      ) : null}

      <form action={signUp} className="space-y-5">
        <div>
          <label
            htmlFor="register-full-name"
            className="block text-sm font-semibold text-[var(--pg-text)]"
          >
            Nom complet
          </label>
          <input
            id="register-full-name"
            className={INPUT_CLASS}
            type="text"
            name="full_name"
            autoComplete="name"
            maxLength={100}
            minLength={2}
            required
            placeholder="Ton nom et prénom"
          />
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-semibold text-[var(--pg-text)]"
          >
            Adresse e-mail
          </label>
          <input
            id="register-email"
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
            htmlFor="register-password"
            className="block text-sm font-semibold text-[var(--pg-text)]"
          >
            Mot de passe
          </label>
          <input
            id="register-password"
            className={INPUT_CLASS}
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-describedby="register-password-hint"
            placeholder="8 caractères minimum"
          />
          <p
            id="register-password-hint"
            className="mt-2 text-sm leading-5 text-[var(--pg-text-muted)]"
          >
            Utilise au moins 8 caractères. Tu pourras ensuite configurer ton
            entreprise.
          </p>
        </div>

        <button type="submit" className={BUTTON_CLASS}>
          Créer mon compte
        </button>
      </form>
    </AuthShell>
  );
}
