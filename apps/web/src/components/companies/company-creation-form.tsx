type CompanyCreationAction = (
  formData: FormData,
) => void | Promise<void>;

const INPUT_CLASS =
  "mt-2 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

export function CompanyCreationForm({
  action,
  submitLabel,
}: {
  action: CompanyCreationAction;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label
          htmlFor="company-legal-name"
          className="block text-sm font-semibold text-[var(--pg-text)]"
        >
          Raison sociale *
        </label>
        <input
          id="company-legal-name"
          className={INPUT_CLASS}
          name="legal_name"
          type="text"
          autoComplete="organization"
          minLength={2}
          maxLength={200}
          required
          placeholder="Nom légal de l’entreprise"
        />
      </div>

      <div>
        <label
          htmlFor="company-trade-name"
          className="block text-sm font-semibold text-[var(--pg-text)]"
        >
          Nom commercial
          <span className="ml-1 font-normal text-[var(--pg-text-muted)]">
            (facultatif)
          </span>
        </label>
        <input
          id="company-trade-name"
          className={INPUT_CLASS}
          name="trade_name"
          type="text"
          autoComplete="organization"
          minLength={2}
          maxLength={200}
          placeholder="Nom utilisé auprès de tes clients"
        />
      </div>

      <p className="text-sm leading-6 text-[var(--pg-text-muted)]">
        Paramètres initiaux : Burkina Faso · XOF · Africa/Ouagadougou.
      </p>

      <button type="submit" className={BUTTON_CLASS}>
        {submitLabel}
      </button>
    </form>
  );
}
