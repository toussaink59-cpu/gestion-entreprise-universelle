import { signIn } from "@/app/auth/actions";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next ?? null);

  const errorMessages: Record<string, string> = {
    "missing-fields": "Renseigne ton adresse e-mail et ton mot de passe.",
    "invalid-email": "Le format de l'adresse e-mail est invalide.",
    "password-too-long": "Le mot de passe depasse la longueur maximale autorisee.",
    "email-not-confirmed":
      "Ton adresse e-mail n'est pas encore confirmée. Ouvre le message de confirmation Supabase.",
    "invalid-credentials": "Adresse e-mail ou mot de passe incorrect.",
    "confirmation-failed":
      "La confirmation a échoué ou le lien a expiré. Demande un nouveau lien.",
  };

  const error = params.error
    ? errorMessages[params.error] ?? "La connexion a échoué."
    : null;

  return (
    <main style={{ maxWidth: 460, margin: "4rem auto", padding: "1.5rem" }}>
      <h1>Connexion à GestionPro</h1>
      <p>Connecte-toi pour accéder à ton espace entreprise.</p>

      {params.message === "check-email" && (
        <p role="status">
          Consulte ta boîte e-mail pour confirmer ton inscription avant de te
          connecter.
        </p>
      )}

      {error && <p role="alert">{error}</p>}

      <form action={signIn}>
        <input type="hidden" name="next" value={nextPath} />
        <label style={{ display: "block", marginTop: "1rem" }}>
          Adresse e-mail
          <input
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <label style={{ display: "block", marginTop: "1rem" }}>
          Mot de passe
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            maxLength={128}
            required
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <button type="submit" style={{ marginTop: "1.5rem", padding: "0.7rem 1rem" }}>
          Se connecter
        </button>
      </form>

      <p style={{ marginTop: "1.5rem" }}>
        Pas encore de compte ? <a href="/register">Créer un compte</a>
      </p>
    </main>
  );
}