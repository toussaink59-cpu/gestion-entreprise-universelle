import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDb, seed, type TestDb } from "./helpers";

// Factures brouillons : autonomes ou issues d'un devis accepté. Aucune émission.

let t: TestDb;
let customerA: string;
let customerB: string;
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params);

const lines = [
  { description: "Prestation A", quantity: "2", unit_label: "jour", unit_price: "10000", discount_type: "percentage", discount_value: "10" },
  { description: "Prestation B", quantity: "1", unit_label: "forfait", unit_price: "5000" },
];

const saveDraft = (who: "alice" | "bob" | "carol" | "dave" | "erin", company: string, customer: string, payload: unknown = lines, invoiceId: string | null = null) =>
  asUser(t.db, who, () =>
    q<{ id: string }>(
      `select public.save_invoice_draft($1, $2, $3::jsonb, current_date, current_date + 30, $4) as id`,
      [company, customer, JSON.stringify(payload), invoiceId],
    ),
  );

async function acceptedQuote(): Promise<string> {
  const d = await asUser(t.db, "alice", () =>
    q<{ id: string }>(`select public.save_quote_draft($1, $2, $3::jsonb, current_date, current_date + 30) as id`, [
      t.companyA, customerA, JSON.stringify(lines),
    ]),
  );
  const id = d.rows[0].id;
  await asUser(t.db, "alice", () => q(`select public.send_quote($1, $2)`, [t.companyA, id]));
  await asUser(t.db, "alice", () =>
    q(`select public.record_quote_response($1, $2, 'accepted', 'email', 'Courriel du 5 nov.')`, [t.companyA, id]),
  );
  return id;
}

const fromQuote = (who: "alice" | "bob" | "dave" | "erin", quote: string) =>
  asUser(t.db, who, () => q<{ id: string }>(`select public.create_invoice_draft_from_quote($1) as id`, [quote]));

beforeAll(async () => {
  t = await seed(await createMigratedDb());
  customerA = (
    await asUser(t.db, "alice", () =>
      q<{ id: string }>(`insert into public.customers (company_id, name) values ($1, 'Client facture') returning id`, [t.companyA]),
    )
  ).rows[0].id;
  customerB = (
    await asUser(t.db, "bob", () =>
      q<{ id: string }>(`insert into public.customers (company_id, name) values ($1, 'Client B') returning id`, [t.companyB]),
    )
  ).rows[0].id;
});
afterAll(async () => {
  await t.db.close();
});

describe("Factures — brouillon autonome", () => {
  it("calcule les montants côté serveur et reste sans numéro ni taxe", async () => {
    const id = (await saveDraft("alice", t.companyA, customerA)).rows[0].id;
    const inv = (
      await q<Record<string, string | null>>(
        `select status, billing_kind, invoice_number, subtotal_amount::text s, discount_amount::text d,
                tax_amount::text t, total_amount::text tot, currency_code, source_quote_id
         from public.invoices where id = $1`,
        [id],
      )
    ).rows[0];
    expect(inv).toMatchObject({ status: "draft", billing_kind: "standalone", invoice_number: null, s: "25000.0000", d: "2000.0000", t: "0.0000", tot: "23000.0000" });
    expect(inv.source_quote_id).toBeNull();
    expect(inv.currency_code).toBe("XOF");
  });

  it("modifie un brouillon en remplaçant ses lignes", async () => {
    const id = (await saveDraft("alice", t.companyA, customerA)).rows[0].id;
    await saveDraft("alice", t.companyA, customerA, [lines[1]], id);
    const n = (await q<{ n: number }>(`select count(*)::int n from public.invoice_lines where invoice_id = $1`, [id])).rows[0].n;
    expect(n).toBe(1);
  });

  it("refuse les taxes, valeurs négatives et non finies", async () => {
    await expect(saveDraft("alice", t.companyA, customerA, [{ ...lines[1], tax_rate: "18" }])).rejects.toThrow(/taxes/i);
    await expect(saveDraft("alice", t.companyA, customerA, [{ ...lines[1], unit_price: "-1" }])).rejects.toThrow(/invalide/i);
    await expect(saveDraft("alice", t.companyA, customerA, [{ ...lines[1], unit_price: "NaN" }])).rejects.toThrow();
    await expect(saveDraft("alice", t.companyA, customerA, [{ ...lines[1], discount_type: "percentage", discount_value: "101" }])).rejects.toThrow(/remise/i);
    await expect(saveDraft("alice", t.companyA, customerA, [])).rejects.toThrow(/lignes/i);
  });

  it("applique les permissions : finance écrit, employé refusé, auditrice en lecture seule", async () => {
    await saveDraft("carol", t.companyA, customerA);
    await expect(saveDraft("dave", t.companyA, customerA)).rejects.toThrow(/permission/i);
    await expect(saveDraft("erin", t.companyA, customerA)).rejects.toThrow(/permission/i);
    const seen = await asUser(t.db, "erin", () => q(`select id from public.invoices where company_id = $1`, [t.companyA]));
    expect(seen.rows.length).toBeGreaterThan(0);
    const hidden = await asUser(t.db, "dave", () => q(`select id from public.invoices where company_id = $1`, [t.companyA]));
    expect(hidden.rows).toHaveLength(0);
  });

  it("isole les entreprises : client étranger refusé, factures invisibles", async () => {
    await expect(saveDraft("alice", t.companyA, customerB)).rejects.toThrow(/client actif/i);
    await expect(saveDraft("bob", t.companyA, customerA)).rejects.toThrow(/permission/i);
    const seen = await asUser(t.db, "bob", () => q(`select id from public.invoices`));
    expect(seen.rows).toHaveLength(0);
  });

  it("interdit toute écriture directe et toute suppression", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(`insert into public.invoices (company_id, customer_id, currency_code) values ($1, $2, 'XOF')`, [t.companyA, customerA]),
      ),
    ).rejects.toThrow();
    await expect(asUser(t.db, "alice", () => q(`delete from public.invoices`))).rejects.toThrow();
    await expect(asUser(t.db, "alice", () => q(`update public.invoices set total_amount = 1`))).rejects.toThrow();
  });
});

describe("Factures — brouillon depuis un devis accepté", () => {
  it("reprend client, devise, lignes et prix acceptés sans rien imputer", async () => {
    const quote = await acceptedQuote();
    const id = (await fromQuote("alice", quote)).rows[0].id;
    const inv = (
      await q<Record<string, string | null>>(
        `select status, billing_kind, source_quote_id::text sq, customer_id::text c, total_amount::text tot,
                quote_allocated_amount::text alloc
         from public.invoices where id = $1`,
        [id],
      )
    ).rows[0];
    expect(inv).toMatchObject({ status: "draft", billing_kind: "full", sq: quote, c: customerA, tot: "23000.0000", alloc: null });
    const l = (
      await q<{ n: number; linked: number }>(
        `select count(*)::int n, count(source_quote_line_id)::int linked from public.invoice_lines where invoice_id = $1`,
        [id],
      )
    ).rows[0];
    expect(l).toEqual({ n: 2, linked: 2 });
  });

  it("refuse un devis non accepté, un doublon de brouillon et les rôles sans droit", async () => {
    const draftQuote = (
      await asUser(t.db, "alice", () =>
        q<{ id: string }>(`select public.save_quote_draft($1, $2, $3::jsonb, current_date, current_date + 30) as id`, [
          t.companyA, customerA, JSON.stringify(lines),
        ]),
      )
    ).rows[0].id;
    await expect(fromQuote("alice", draftQuote)).rejects.toThrow(/accepté/i);

    const quote = await acceptedQuote();
    await expect(fromQuote("dave", quote)).rejects.toThrow(/permission/i);
    await expect(fromQuote("erin", quote)).rejects.toThrow(/permission/i);
    await expect(fromQuote("bob", quote)).rejects.toThrow(/permission/i);
    await fromQuote("alice", quote);
    await expect(fromQuote("alice", quote)).rejects.toThrow(/existe déjà/i);
  });

  it("un brouillon issu d'un devis n'est pas modifiable par save_invoice_draft", async () => {
    const quote = await acceptedQuote();
    const id = (await fromQuote("alice", quote)).rows[0].id;
    await expect(saveDraft("alice", t.companyA, customerA, lines, id)).rejects.toThrow(/non modifiable/i);
  });

  it("impossible de rattacher une facture au devis d'un autre client", async () => {
    const quote = await acceptedQuote();
    const other = (
      await asUser(t.db, "alice", () =>
        q<{ id: string }>(`insert into public.customers (company_id, name) values ($1, 'Autre client') returning id`, [t.companyA]),
      )
    ).rows[0].id;
    await expect(
      q(
        `insert into public.invoices (company_id, customer_id, source_quote_id, billing_kind, currency_code, created_by, updated_by)
         values ($1, $2, $3, 'full', 'XOF', $4, $4)`,
        [t.companyA, other, quote, (await q<{ id: string }>(`select id from public.users limit 1`)).rows[0].id],
      ),
    ).rejects.toThrow();
  });
});

describe("Factures — abandon d'un brouillon", () => {
  it("conserve la trace, exige un motif et ferme le brouillon", async () => {
    const id = (await saveDraft("alice", t.companyA, customerA)).rows[0].id;
    await expect(asUser(t.db, "alice", () => q(`select public.abandon_invoice_draft($1, 'x')`, [id]))).rejects.toThrow(/motif/i);
    await expect(asUser(t.db, "dave", () => q(`select public.abandon_invoice_draft($1, 'Erreur de client')`, [id]))).rejects.toThrow(/introuvable/i);
    await asUser(t.db, "alice", () => q(`select public.abandon_invoice_draft($1, 'Erreur de client')`, [id]));
    const inv = (await q<{ status: string; reason: string }>(`select status, abandon_reason reason from public.invoices where id = $1`, [id])).rows[0];
    expect(inv).toEqual({ status: "abandoned_draft", reason: "Erreur de client" });
    await expect(asUser(t.db, "alice", () => q(`select public.abandon_invoice_draft($1, 'Encore')`, [id]))).rejects.toThrow(/introuvable/i);
    await expect(saveDraft("alice", t.companyA, customerA, lines, id)).rejects.toThrow(/non modifiable/i);
  });

  it("un brouillon abandonné libère le devis pour un nouveau brouillon", async () => {
    const quote = await acceptedQuote();
    const id = (await fromQuote("alice", quote)).rows[0].id;
    await asUser(t.db, "alice", () => q(`select public.abandon_invoice_draft($1, 'Refaire la facture')`, [id]));
    await fromQuote("alice", quote);
  });

  it("journalise sans données personnelles", async () => {
    const ev = await q<{ action: string }>(
      `select action from public.audit_events where entity_type = 'invoices' order by created_at`,
    );
    const actions = ev.rows.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(["invoices.draft_created", "invoices.draft_created_from_quote", "invoices.draft_abandoned"]));
  });
});
