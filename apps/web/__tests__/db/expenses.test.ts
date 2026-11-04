import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asUser,
  createMigratedDb,
  ids,
  seed,
  type TestDb,
} from "./helpers";

const DENIED = /permission|row-level security|42501|not authorized/i;

let t: TestDb;
let supplierA: string;
let supplierB: string;
let expenseId: string;

const q = <R extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => t.db.query<R>(sql, params);

async function saveDraft(
  actor: "alice" | "bob" | "carol" | "dave" | "erin" | "frank" | "mallory",
  companyId: string,
  supplierId: string | null = null,
  values: {
    date?: string;
    category?: string;
    description?: string;
    amount?: string;
    notes?: string | null;
  } = {},
  existingId: string | null = null,
) {
  return asUser(t.db, actor, () =>
    q<{ id: string }>(
      `select public.save_expense_draft(
        $1, $2::date, $3, $4, $5::numeric, $6, $7, $8
      ) as id`,
      [
        companyId,
        values.date ?? "2026-11-04",
        values.category ?? "Fournitures",
        values.description ?? "Achat de fournitures de bureau",
        values.amount ?? "12500",
        supplierId,
        values.notes ?? null,
        existingId,
      ],
    ),
  );
}

beforeAll(async () => {
  t = await seed(await createMigratedDb());

  const a = await asUser(t.db, "alice", () =>
    q<{ id: string }>(
      `insert into public.suppliers(company_id, name)
       values ($1, $2) returning id`,
      [t.companyA, "Fournisseur A"],
    ),
  );
  supplierA = a.rows[0].id;

  const b = await asUser(t.db, "bob", () =>
    q<{ id: string }>(
      `insert into public.suppliers(company_id, name)
       values ($1, $2) returning id`,
      [t.companyB, "Fournisseur B"],
    ),
  );
  supplierB = b.rows[0].id;

  await asUser(t.db, "alice", () =>
    q(
      `update public.company_memberships
       set role_code = 'sales_purchasing'
       where user_id = $1 and company_id = $2`,
      [ids.erin, t.companyA],
    ),
  );

  const created = await saveDraft("alice", t.companyA, supplierA);
  expenseId = created.rows[0].id;
});

afterAll(async () => {
  await t.db.close();
});

describe("Brouillons de dépenses — données et intégrité", () => {
  it("enregistre une dépense avec la devise de l'entreprise et sans statut de paiement", async () => {
    const result = await asUser(t.db, "alice", () =>
      q<{
        amount: string;
        currency_code: string;
        status: string;
        supplier_id: string;
        description: string;
      }>(
        `select amount, currency_code, status, supplier_id, description
         from public.expenses where id = $1 and company_id = $2`,
        [expenseId, t.companyA],
      ),
    );

    expect(result.rows).toEqual([
      {
        amount: "12500.0000",
        currency_code: "XOF",
        status: "draft",
        supplier_id: supplierA,
        description: "Achat de fournitures de bureau",
      },
    ]);
  });

  it("normalise les textes et met à jour un brouillon de manière transactionnelle", async () => {
    await saveDraft(
      "carol",
      t.companyA,
      supplierA,
      {
        category: "  Transport  ",
        description: "  Déplacement professionnel  ",
        amount: "25000.5",
        notes: "  Justificatif à joindre ultérieurement  ",
      },
      expenseId,
    );

    const result = await asUser(t.db, "alice", () =>
      q<{
        category: string;
        description: string;
        amount: string;
        notes: string;
      }>(
        `select category, description, amount, notes
         from public.expenses where id = $1`,
        [expenseId],
      ),
    );

    expect(result.rows[0]).toEqual({
      category: "Transport",
      description: "Déplacement professionnel",
      amount: "25000.5000",
      notes: "Justificatif à joindre ultérieurement",
    });
  });

  it("refuse les montants nuls, négatifs ou avec plus de quatre décimales", async () => {
    await expect(
      saveDraft("alice", t.companyA, null, { amount: "0" }),
    ).rejects.toThrow(/montant/i);
    await expect(
      saveDraft("alice", t.companyA, null, { amount: "-10" }),
    ).rejects.toThrow(/montant/i);
    await expect(
      saveDraft("alice", t.companyA, null, { amount: "10.12345" }),
    ).rejects.toThrow(/montant/i);
  });

  it("refuse les champs texte invalides", async () => {
    await expect(
      saveDraft("alice", t.companyA, null, { category: "A" }),
    ).rejects.toThrow(/champs texte/i);
    await expect(
      saveDraft("alice", t.companyA, null, { description: " " }),
    ).rejects.toThrow(/champs texte/i);
    await expect(
      saveDraft("alice", t.companyA, null, { notes: "x".repeat(2001) }),
    ).rejects.toThrow(/champs texte/i);
  });

  it("refuse un fournisseur d'une autre entreprise ou archivé", async () => {
    await expect(
      saveDraft("alice", t.companyA, supplierB),
    ).rejects.toThrow(/fournisseur actif introuvable/i);

    await asUser(t.db, "alice", () =>
      q(
        `update public.suppliers set status = 'archived'
         where id = $1 and company_id = $2`,
        [supplierA, t.companyA],
      ),
    );

    await expect(
      saveDraft("alice", t.companyA, supplierA),
    ).rejects.toThrow(/fournisseur actif introuvable/i);
  });

  it("journalise les actions sans copier la description ou les notes dans le journal", async () => {
    const events = await asUser(t.db, "alice", () =>
      q<{ action: string; metadata: Record<string, unknown> }>(
        `select action, metadata
         from public.audit_events
         where company_id = $1 and entity_type = 'expenses' and entity_id = $2
         order by created_at`,
        [t.companyA, expenseId],
      ),
    );

    expect(events.rows.map((row) => row.action)).toContain("expenses.created");
    expect(events.rows.map((row) => row.action)).toContain("expenses.updated");
    expect(JSON.stringify(events.rows)).not.toContain("Déplacement professionnel");
    expect(JSON.stringify(events.rows)).not.toContain("Justificatif à joindre");
  });
});

describe("Brouillons de dépenses — permissions et isolation", () => {
  it("le commercial peut créer une dépense mais pas modifier un brouillon", async () => {
    await asUser(t.db, "alice", () =>
      q(`update public.company_memberships set role_code = 'sales_purchasing' where user_id = $1 and company_id = $2`, [ids.erin, t.companyA]),
    );
    const created = await saveDraft("erin", t.companyA);
    expect(created.rows[0].id).toBeTruthy();

    await expect(
      saveDraft("erin", t.companyA, null, { amount: "1500" }, created.rows[0].id),
    ).rejects.toThrow(DENIED);
  });

  it("la finance peut consulter et modifier les brouillons de son entreprise", async () => {
    const visible = await asUser(t.db, "carol", () =>
      q<{ id: string }>(
        `select id from public.expenses where company_id = $1 and id = $2`,
        [t.companyA, expenseId],
      ),
    );
    expect(visible.rows).toHaveLength(1);

    const updated = await saveDraft(
      "carol",
      t.companyA,
      null,
      { amount: "3000" },
      expenseId,
    );
    expect(updated.rows[0].id).toBe(expenseId);
  });

  it("l'auditeur peut lire mais ne peut pas créer une dépense", async () => {
    await asUser(t.db, "alice", () =>
      q(`update public.company_memberships set role_code = 'auditor' where user_id = $1 and company_id = $2`, [ids.erin, t.companyA]),
    );
    const visible = await asUser(t.db, "erin", () =>
      q<{ id: string }>(
        `select id from public.expenses where company_id = $1`,
        [t.companyA],
      ),
    );
    expect(visible.rows.length).toBeGreaterThan(0);

    await expect(
      saveDraft("erin", t.companyA),
    ).rejects.toThrow(DENIED);
  });

  it("un membre ne peut pas écrire dans une autre entreprise", async () => {
    await expect(
      saveDraft("alice", t.companyB),
    ).rejects.toThrow(DENIED);
  });

  it("un utilisateur sans entreprise et un visiteur ne peuvent ni lire ni écrire", async () => {
    const invisible = await asUser(t.db, "mallory", () =>
      q(`select id from public.expenses where company_id = $1`, [t.companyA]),
    );
    expect(invisible.rows).toHaveLength(0);

    await expect(
      asAnon(t.db, () =>
        q(`select public.save_expense_draft(
          $1, current_date, 'Divers', 'Dépense anonyme', 100
        )`, [t.companyA]),
      ),
    ).rejects.toThrow(DENIED);
  });

  it("interdit les écritures et suppressions directes sur la table", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(
          `insert into public.expenses(
             company_id, expense_date, category, description, amount, currency_code
           ) values ($1, current_date, 'Divers', 'Écriture directe', 100, 'XOF')`,
          [t.companyA],
        ),
      ),
    ).rejects.toThrow(DENIED);

    await expect(
      asUser(t.db, "alice", () =>
        q(`update public.expenses set amount = 1 where id = $1`, [expenseId]),
      ),
    ).rejects.toThrow(DENIED);

    await expect(
      asUser(t.db, "alice", () =>
        q(`delete from public.expenses where id = $1`, [expenseId]),
      ),
    ).rejects.toThrow(DENIED);
  });
});
