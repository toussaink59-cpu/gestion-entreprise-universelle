import type { DuplicateCriterion, DuplicateGroup, DuplicateCandidate } from "@/lib/contacts/duplicate-detection";

export type DuplicateLabels = {
  title: string;
  description: string;
  reasons: Record<DuplicateCriterion, string>;
  reasonPrefix: string;
  unavailable: string;
};

export function DuplicateGroups({
  groups,
  failed,
  labels,
}: {
  groups: DuplicateGroup<DuplicateCandidate>[];
  failed: boolean;
  labels: DuplicateLabels;
}) {
  if (!failed && groups.length === 0) return null;
  return (
    <section aria-labelledby="duplicates-title" className="mb-8 border-b border-[var(--pg-border)] pb-6">
      <h2 id="duplicates-title" className="text-lg font-semibold text-[var(--pg-text)]">{labels.title}</h2>
      <p className="mt-1 text-sm text-[var(--pg-text-muted)]">{labels.description}</p>
      {failed ? (
        <p role="alert" className="mt-3 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-3 text-sm text-[#963F3F]">{labels.unavailable}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {groups.map((group) => (
            <li key={group.members.map((member) => member.id).join("-")} className="rounded-md border border-[#EADFC0] bg-[#F8F4EA] p-3 text-sm text-[#76571F]">
              <p className="font-medium">{group.members.map((member) => member.name).join(" · ")}</p>
              <p className="mt-1">{labels.reasonPrefix} {group.reasons.map((reason) => labels.reasons[reason]).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type HistoryRow = { key: string; primary: string; secondary: string; status: string; amount: string };

export type HistoryLabels = {
  summary: string;
  empty: string;
  unavailable: string;
  columns: { reference: string; date: string; status: string; amount: string };
  phase2Note: string;
};

export function ContactHistory({
  rows,
  failed,
  labels,
}: {
  rows: HistoryRow[];
  failed: boolean;
  labels: HistoryLabels;
}) {
  return (
    <details className="w-full">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-[var(--pg-accent)] hover:underline">{labels.summary}</summary>
      <div className="mt-2 min-w-64 text-sm">
        {failed ? (
          <p role="alert" className="text-[#963F3F]">{labels.unavailable}</p>
        ) : rows.length === 0 ? (
          <p className="text-[var(--pg-text-muted)]">{labels.empty}</p>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="text-[var(--pg-text-muted)]">
              <tr>
                <th scope="col" className="py-1 pr-3 font-semibold">{labels.columns.reference}</th>
                <th scope="col" className="py-1 pr-3 font-semibold">{labels.columns.date}</th>
                <th scope="col" className="py-1 pr-3 font-semibold">{labels.columns.status}</th>
                <th scope="col" className="py-1 text-right font-semibold">{labels.columns.amount}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-[var(--pg-border)]">
                  <td className="py-1 pr-3 text-[var(--pg-text)]">{row.primary}</td>
                  <td className="py-1 pr-3 text-[var(--pg-text-muted)]">{row.secondary}</td>
                  <td className="py-1 pr-3 text-[var(--pg-text)]">{row.status}</td>
                  <td className="py-1 text-right tabular-nums text-[var(--pg-text)]">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-[var(--pg-text-muted)]">{labels.phase2Note}</p>
      </div>
    </details>
  );
}
