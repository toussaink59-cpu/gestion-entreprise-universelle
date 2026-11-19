export type DuplicateReason = 'name' | 'email' | 'phone' | 'taxIdentifier';

export type DuplicateContactCandidate = {
  id: string;
  company_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  tax_identifier?: string | null;
};

export type ContactDuplicateMatch = {
  companyId: string;
  contactId: string;
  duplicateContactId: string;
  reasons: DuplicateReason[];
};

export type ContactDuplicateDetectionResult = {
  matches: ContactDuplicateMatch[];
  truncated: boolean;
};

const MAX_DUPLICATE_PAIRS = 500;
const REASON_ORDER: DuplicateReason[] = ['name', 'email', 'phone', 'taxIdentifier'];

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizeEmail(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeTaxIdentifier(value: string): string {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function normalizedFields(
  contact: DuplicateContactCandidate,
): Array<[DuplicateReason, string]> {
  const fields: Array<[DuplicateReason, string]> = [];
  const name = normalizeName(contact.name);
  const email = contact.email ? normalizeEmail(contact.email) : '';
  const phone = contact.phone ? normalizePhone(contact.phone) : '';
  const taxIdentifier = contact.tax_identifier
    ? normalizeTaxIdentifier(contact.tax_identifier)
    : '';

  if (name) fields.push(['name', name]);
  if (email) fields.push(['email', email]);
  if (phone) fields.push(['phone', phone]);
  if (taxIdentifier) fields.push(['taxIdentifier', taxIdentifier]);

  return fields;
}

export function detectContactDuplicates(
  contacts: DuplicateContactCandidate[],
): ContactDuplicateDetectionResult {
  const index = new Map<string, {
    reason: DuplicateReason;
    contacts: DuplicateContactCandidate[];
  }>();

  for (const contact of contacts) {
    for (const [reason, value] of normalizedFields(contact)) {
      const key = JSON.stringify([contact.company_id, reason, value]);
      const group = index.get(key);
      if (group) {
        group.contacts.push(contact);
      } else {
        index.set(key, { reason, contacts: [contact] });
      }
    }
  }

  const pairs = new Map<string, {
    companyId: string;
    contactId: string;
    duplicateContactId: string;
    reasons: Set<DuplicateReason>;
  }>();
  let truncated = false;

  outer: for (const group of index.values()) {
    for (let i = 0; i < group.contacts.length; i += 1) {
      for (let j = i + 1; j < group.contacts.length; j += 1) {
        const first = group.contacts[i];
        const second = group.contacts[j];
        if (first.id === second.id) continue;

        const [contactId, duplicateContactId] =
          first.id.localeCompare(second.id) <= 0
            ? [first.id, second.id]
            : [second.id, first.id];
        const pairKey = JSON.stringify([
          first.company_id,
          contactId,
          duplicateContactId,
        ]);
        const existing = pairs.get(pairKey);

        if (existing) {
          existing.reasons.add(group.reason);
          continue;
        }

        if (pairs.size >= MAX_DUPLICATE_PAIRS) {
          truncated = true;
          break outer;
        }

        pairs.set(pairKey, {
          companyId: first.company_id,
          contactId,
          duplicateContactId,
          reasons: new Set([group.reason]),
        });
      }
    }
  }

  const matches = [...pairs.values()]
    .map((pair) => ({
      companyId: pair.companyId,
      contactId: pair.contactId,
      duplicateContactId: pair.duplicateContactId,
      reasons: REASON_ORDER.filter((reason) => pair.reasons.has(reason)),
    }))
    .sort((a, b) =>
      a.contactId.localeCompare(b.contactId) ||
      a.duplicateContactId.localeCompare(b.duplicateContactId),
    );

  return { matches, truncated };
}
