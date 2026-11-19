import { describe, expect, it } from 'vitest';
import {
  detectContactDuplicates,
  type DuplicateContactCandidate,
} from './duplicate-detection';

const companyA = 'company-a';

function contact(
  id: string,
  overrides: Partial<DuplicateContactCandidate> = {},
): DuplicateContactCandidate {
  return {
    id,
    company_id: companyA,
    name: 'Contact ' + id,
    email: null,
    phone: null,
    tax_identifier: null,
    ...overrides,
  };
}

describe('detectContactDuplicates', () => {
  it('detects names regardless of accents, case and punctuation', () => {
    const result = detectContactDuplicates([
      contact('a', { name: 'École Kiemdé SARL' }),
      contact('b', { name: 'ecole kiemde sarl' }),
    ]);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].reasons).toContain('name');
  });

  it('normalizes email addresses', () => {
    const result = detectContactDuplicates([
      contact('a', { email: 'INFO@example.com' }),
      contact('b', { email: ' info@example.com ' }),
    ]);

    expect(result.matches[0].reasons).toEqual(['email']);
  });

  it('normalizes phone formatting', () => {
    const result = detectContactDuplicates([
      contact('a', { phone: '70 12 34 56' }),
      contact('b', { phone: '70-12-34-56' }),
    ]);

    expect(result.matches[0].reasons).toEqual(['phone']);
  });

  it('normalizes tax identifiers', () => {
    const result = detectContactDuplicates([
      contact('a', { tax_identifier: 'BF 123-456' }),
      contact('b', { tax_identifier: 'bf123456' }),
    ]);

    expect(result.matches[0].reasons).toEqual(['taxIdentifier']);
  });

  it('collects all matching reasons for the same pair and returns both contact identities', () => {
    const result = detectContactDuplicates([
      contact('a', {
        name: 'KIEMDE TECH',
        email: 'info@kiemde.test',
        phone: '70 12 34 56',
        tax_identifier: 'BF-123456',
      }),
      contact('b', {
        name: 'Kiemde Tech',
        email: 'INFO@KIEMDE.TEST',
        phone: '70-12-34-56',
        tax_identifier: 'BF123456',
      }),
    ]);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      companyId: companyA,
      contactId: 'a',
      duplicateContactId: 'b',
    });
    expect(result.matches[0].reasons).toEqual([
      'name',
      'email',
      'phone',
      'taxIdentifier',
    ]);
  });

  it('never matches contacts from different companies', () => {
    const result = detectContactDuplicates([
      contact('a', { name: 'Same Company' }),
      contact('b', { name: 'Same Company', company_id: 'company-b' }),
    ]);

    expect(result.matches).toHaveLength(0);
  });

  it('ignores empty values and never matches a contact with itself', () => {
    const result = detectContactDuplicates([
      contact('a', { email: '  ', phone: '', tax_identifier: null }),
    ]);

    expect(result.matches).toHaveLength(0);
  });

  it('limits the number of returned pairs', () => {
    const contacts = Array.from({ length: 33 }, (_, index) =>
      contact('contact-' + String(index).padStart(2, '0'), {
        name: 'Same Business',
      }),
    );
    const result = detectContactDuplicates(contacts);

    expect(result.matches).toHaveLength(500);
    expect(result.truncated).toBe(true);
  });
});
