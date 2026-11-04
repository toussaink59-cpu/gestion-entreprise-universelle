import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createMigratedDb,
  ids,
  seed,
  type TestDb,
} from "./helpers";

const DENIED = /permission|row-level security|42501|not authorized/i;

let t: TestDb;
let customerId: string;
let quoteId: string;

const q = <R extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => t.db.query<R>(sql, params);

const draftLines = [
  {
    description: "Prestation de conseil",
    quantity: "2",
    unit_label: "jour",
    unit_price: "1000",
    discount_type: "percentage",
    discount_value: "10",
  },
  {
    description: "Frais de dossier",
    quantity: "1",
    unit_label: "forfait",
    unit_price: "500",
    discount_type: "fixed",
    discount_value: "50",
  },
];

async function saveDraft(
  actor: "alice" | "carol" | "dave" | "erin" | "frank" | "bob",
  companyId: string,
  customer: string,
  lines = draftLines,
  existingQuoteId: string | null = null,
) {
  return asUser(t.db, actor, () =>
    q<{ id: string }>(
      `select public.save_quote_draft(
        $1, $2, $3::jsonb, current_date, current_date + 30, $4,
        $5, $6, $7
      ) as id`,
      [
        companyId,
        customer,
        JSON.stringify(lines),
        existingQuoteId,
        "Objet du devis",
        "Conditions commerciales",
        null,
      ],
    ),
  );
}

beforeAll(async () => {
  t = await seed(await createMigratedDb());

  const customer = await asUser(t.db, "alice", () =>
    q<{ id: string }>(
      `insert into public.customers (company_id, name)
       values ($1, $2) returning id`,
      [t.companyA, "Client devis A"],
    ),
  );
  customerId = customer.rows[0].id;

  await asUser(t.db, "alice", () =>
    q(
      `update public.company_memberships
       set role_code = 'sales_purchasing'
       where user_id = $1 and company_id = $2`,
      [ids.erin, t.companyA],
    ),
  );

  const created = await saveDraft("alice", t.companyA, customerId);
  quoteId = created.rows[0].id;
});

afterAll(async () => {
  await t.db.close();
});

describe("Devis brouillons — calculs et intégrité", () => {
  it("calcule les totaux côté serveur sans accepter de taxe non configurée", async () => {
    const result = await asUser(t.db, "alice", () =>
      q<{
        subtotal_amount: string;
        discount_amount: string;
        tax_amount: string;
        total_amount: string;
        status: string;
        quote_number: string | null;
      }>(
        `select subtotal_amount, discount_amount, tax_amount,
                total_amount, status, quote_number
         from public.quotes where id = $1`,
        [quoteId],
      ),
    );

    expect(result.rows[0]).toMatchObject({
      subtotal_amount: "2500.0000",
      discount_amount: "250.0000",
      tax_amount: "0.0000",
      total_amount: "2250.0000",
      status: "draft",
      quote_number: null,
    });
  });

  it("refuse un taux de taxe tant que les règles fiscales ne sont pas validées", async () => {
    await expect(
      saveDraft("alice", t.companyA, customerId, [
        {
          description: "Prestation taxable",
          quantity: "1",
          unit_label: "unité",
          unit_price: "1000",
          tax_rate: "18",
        },
      ]),
    ).rejects.toThrow(/taxes ne sont pas configurées/i);
  });

  it("refuse une remise supérieure à la valeur de la ligne", async () => {
    await expect(
      saveDraft("alice", t.companyA, customerId, [
        {
          description: "Prestation",
          quantity: "1",
          unit_label: "unité",
          unit_price: "100",
          discount_type: "fixed",
          discount_value: "101",
        },
      ]),
    ).rejects.toThrow(/remise supérieure/i);
  });

  it("refuse une quantité nulle ou négative", async () => {
    await expect(
      saveDraft("alice", t.companyA, customerId, [
        {
          description: "Prestation",
          quantity: "0",
          unit_label: "unité",
          unit_price: "100",
        },
      ]),
    ).rejects.toThrow(/valeur invalide/i);
  });

  it("met à jour un brouillon et remplace ses lignes dans une seule transaction", async () => {
    const changed = await saveDraft(
      "erin",
      t.companyA,
      customerId,
      [
        {
          description: "Nouvelle prestation",
          quantity: "3",
          unit_label: "heure",
          unit_price: "200",
        },
      ],
      quoteId,
    );

    expect(changed.rows[0].id).toBe(quoteId);

    const quote = await asUser(t.db, "alice", () =>
      q<{ total_amount: string; subtotal_amount: string }>(
        `select total_amount, subtotal_amount
         from public.quotes where id = $1`,
        [quoteId],
      ),
    );
    const lines = await asUser(t.db, "alice", () =>
      q<{ description: string; position: number }>(
        `select description, position from public.quote_lines
         where quote_id = $1 order by position`,
        [quoteId],
      ),
    );

    expect(quote.rows[0]).toEqual({
      total_amount: "600.0000",
      subtotal_amount: "600.0000",
    });
    expect(lines.rows).toEqual([
      { description: "Nouvelle prestation", position: 1 },
    ]);
  });

  it("journalise la création et les mises à jour sans stocker les descriptions", async () => {
    const events = await asUser(t.db, "alice", () =>
      q<{ action: string; metadata: Record<string, unknown> }>(
        `select action, metadata from public.audit_events
         where company_id = $1 and entity_type = 'quotes' and entity_id = $2
         order by created_at`,
        [t.companyA, quoteId],
      ),
    );

    expect(events.rows.map((row) => row.action)).toContain(
      "quotes.draft_created",
    );
    expect(events.rows.map((row) => row.action)).toContain(
      "quotes.draft_updated",
    );
    expect(JSON.stringify(events.rows)).not.toContain("Nouvelle prestation");
    expect(events.rows.at(-1)?.metadata).toMatchObject({
      line_count: 1,
      total_amount: 600,
    });
  });
});

describe("Devis brouillons — permissions et isolation", () => {
  it("le commercial peut créer et modifier un devis dans son entreprise", async () => {
    const result = await saveDraft("erin", t.companyA, customerId);
    expect(result.rows[0].id).toBeTruthy();
  });

  it("la finance peut lire les devis mais ne peut pas en créer ou modifier", async () => {
    const visible = await asUser(t.db, "carol", () =>
      q<{ id: string }>(
        `select id from public.quotes where id = $1`,
        [quoteId],
      ),
    );
    expect(visible.rows).toHaveLength(1);

    await expect(
      saveDraft("carol", t.companyA, customerId),
    ).rejects.toThrow(DENIED);

    await expect(
      asUser(t.db, "carol", () =>
        q(`select public.save_quote_draft(
          $1, $2, $3::jsonb, current_date, current_date + 30, $4, null, null, null
        )`, [t.companyA, customerId, JSON.stringify(draftLines), quoteId]),
      ),
    ).rejects.toThrow(DENIED);
  });

  it("le rôle commercial ne peut ni créer ni modifier une facture", async () => {
    const permissions = await asUser(t.db, "erin", () =>
      q<{ can_create: boolean; can_update: boolean; can_validate: boolean }>(
        `select
          app.has_permission($1, 'invoices', 'create') as can_create,
          app.has_permission($1, 'invoices', 'update') as can_update,
          app.has_permission($1, 'invoices', 'validate') as can_validate`,
        [t.companyA],
      ),
    );

    expect(permissions.rows[0]).toEqual({
      can_create: false,
      can_update: false,
      can_validate: false,
    });
  });

  it("la finance ne peut pas annuler une facture par simple permission", async () => {
    const permission = await asUser(t.db, "carol", () =>
      q<{ can_cancel: boolean }>(
        `select app.has_permission($1, 'invoices', 'cancel') as can_cancel`,
        [t.companyA],
      ),
    );

    expect(permission.rows[0].can_cancel).toBe(false);
  });

  it("un employé ne voit aucun devis", async () => {
    const result = await asUser(t.db, "dave", () =>
      q(`select id from public.quotes where company_id = $1`, [t.companyA]),
    );
    expect(result.rows).toHaveLength(0);
  });

  it("un membre ne peut pas créer un devis pour une autre entreprise", async () => {
    await expect(
      saveDraft("alice", t.companyB, customerId),
    ).rejects.toThrow(DENIED);
  });

  it("refuse un client appartenant à une autre entreprise", async () => {
    const customerB = await asUser(t.db, "bob", () =>
      q<{ id: string }>(
        `insert into public.customers (company_id, name)
         values ($1, $2) returning id`,
        [t.companyB, "Client devis B"],
      ),
    );

    await expect(
      saveDraft("alice", t.companyA, customerB.rows[0].id),
    ).rejects.toThrow(/client actif introuvable/i);
  });

  it("interdit les écritures directes et la suppression définitive", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(
          `insert into public.quotes (company_id, customer_id, valid_until, currency_code)
           values ($1, $2, current_date + 30, 'XOF')`,
          [t.companyA, customerId],
        ),
      ),
    ).rejects.toThrow(DENIED);

    await expect(
      asUser(t.db, "alice", () =>
        q(`delete from public.quotes where id = $1`, [quoteId]),
      ),
    ).rejects.toThrow(DENIED);
  });
});
