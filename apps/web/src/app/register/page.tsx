import { signUp } from "@/app/auth/actions";

export const instant = false;

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;

  const errorMessages: Record<string, string> = {
    "missing-fields": "Tous les champs sont obligatoires.",
    "password-too-short": "Le mot de passe doit contenir au moins 8 caractères.",
    "signup-failed":
      "Impossible de créer le compte. Vérifie les informations ou réessaie.",
  };

  const error = params.error
    ? errorMessages[params.error] ?? "L'inscription a échoué."
    : null;

  return (
    <main style={{ maxWidth: 460, margin: "4rem auto", padding: "1.5rem" }}>
      <h1>Créer un compte</h1>
      <p>Crée ton accès pour configurer ton entreprise.</p>

      {error && <p role="alert">{error}</p>}

      <form action={signUp}>
        <label style={{ display: "block", marginTop: "1rem" }}>
          Nom complet
          <input
            type="text"
            name="full_name"
            autoComplete="name"
            required
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <label style={{ display: "block", marginTop: "1rem" }}>
          Adresse e-mail
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <label style={{ display: "block", marginTop: "1rem" }}>
          Mot de passe (8 caractères minimum)
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            style={{ display: "block", width: "100%", padding: "0.7rem" }}
          />
        </label>

        <button type="submit" style={{ marginTop: "1.5rem", padding: "0.7rem 1rem" }}>
          Créer mon compte
        </button>
      </form>

      <p style={{ marginTop: "1.5rem" }}>
        Déjà inscrit ? <a href="/login">Se connecter</a>
      </p>
    </main>
  );
}