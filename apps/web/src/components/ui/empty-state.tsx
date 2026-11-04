import { useId, type ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-dashed border-[var(--pg-border)] bg-[var(--pg-surface)] px-5 py-10 text-center sm:px-8"
    >
      <h2
        id={titleId}
        className="text-base font-semibold text-[var(--pg-text)]"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--pg-text-muted)]">
        {description}
      </p>
      {action ? (
        <div className="mt-5 flex justify-center">{action}</div>
      ) : null}
    </section>
  );
}
