// FR-CRM-04 — détection des doublons potentiels dans un répertoire (clients ou fournisseurs).
// La détection ne fusionne, ne modifie et ne supprime jamais rien : elle signale seulement
// des fiches à examiner. Les critères sont activables un à un.

export type DuplicateCriterion = "name" | "email" | "taxIdentifier" | "phone";

export type DuplicateCriteria = Record<DuplicateCriterion, boolean>;

/** Critères par défaut. Un critère désactivé n'est jamais utilisé pour rapprocher deux fiches. */
export const DEFAULT_DUPLICATE_CRITERIA: DuplicateCriteria = {
  name: true,
  email: true,
  taxIdentifier: true,
  phone: true,
};

export type DuplicateCandidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_identifier: string | null;
};

export type DuplicateGroup<T extends DuplicateCandidate = DuplicateCandidate> = {
  members: T[];
  reasons: DuplicateCriterion[];
};

const MIN_PHONE_DIGITS = 6;
const MIN_TAX_ID_LENGTH = 4;

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTaxIdentifier(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function normalizePhone(value: string): string {
  return value.replace(/\D+/g, "");
}

/** Clé de rapprochement d'une fiche pour un critère, ou null si la valeur est absente ou trop courte. */
export function duplicateKey(candidate: DuplicateCandidate, criterion: DuplicateCriterion): string | null {
  switch (criterion) {
    case "name": {
      const key = normalizeName(candidate.name);
      return key.length >= 2 ? key : null;
    }
    case "email": {
      const key = candidate.email ? normalizeEmail(candidate.email) : "";
      return key.includes("@") ? key : null;
    }
    case "taxIdentifier": {
      const key = candidate.tax_identifier ? normalizeTaxIdentifier(candidate.tax_identifier) : "";
      return key.length >= MIN_TAX_ID_LENGTH ? key : null;
    }
    case "phone": {
      const key = candidate.phone ? normalizePhone(candidate.phone) : "";
      return key.length >= MIN_PHONE_DIGITS ? key : null;
    }
  }
}

const CRITERIA_ORDER: DuplicateCriterion[] = ["name", "email", "taxIdentifier", "phone"];

/**
 * Regroupe les fiches qui partagent au moins une valeur normalisée sur un critère actif.
 * Deux fiches reliées indirectement (A~B par le nom, B~C par l'e-mail) forment un même groupe.
 */
export function findDuplicateGroups<T extends DuplicateCandidate>(
  candidates: readonly T[],
  criteria: DuplicateCriteria = DEFAULT_DUPLICATE_CRITERIA,
): DuplicateGroup<T>[] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    let current = id;
    while (parent.get(current) !== root) {
      const next = parent.get(current) as string;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  for (const candidate of candidates) parent.set(candidate.id, candidate.id);

  const matchedCriteria = new Map<string, Set<DuplicateCriterion>>();
  const reasonsByPair: { criterion: DuplicateCriterion; ids: string[] }[] = [];

  for (const criterion of CRITERIA_ORDER) {
    if (!criteria[criterion]) continue;
    const buckets = new Map<string, string[]>();
    for (const candidate of candidates) {
      const key = duplicateKey(candidate, criterion);
      if (!key) continue;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(candidate.id);
      else buckets.set(key, [candidate.id]);
    }
    for (const ids of buckets.values()) {
      if (ids.length < 2) continue;
      reasonsByPair.push({ criterion, ids });
      for (let index = 1; index < ids.length; index += 1) {
        parent.set(find(ids[index]), find(ids[0]));
      }
    }
  }

  for (const { criterion, ids } of reasonsByPair) {
    const root = find(ids[0]);
    const reasons = matchedCriteria.get(root) ?? new Set<DuplicateCriterion>();
    reasons.add(criterion);
    matchedCriteria.set(root, reasons);
  }

  const groups = new Map<string, T[]>();
  for (const candidate of candidates) {
    const root = find(candidate.id);
    const members = groups.get(root);
    if (members) members.push(candidate);
    else groups.set(root, [candidate]);
  }

  const result: DuplicateGroup<T>[] = [];
  for (const [root, members] of groups) {
    if (members.length < 2) continue;
    const reasons = CRITERIA_ORDER.filter((criterion) => {
      // Les raisons sont rattachées à la racine finale du groupe.
      return [...matchedCriteria.entries()].some(([key, set]) => find(key) === root && set.has(criterion));
    });
    result.push({ members, reasons });
  }
  return result;
}
