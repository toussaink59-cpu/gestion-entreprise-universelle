import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDb, ids, seed, type TestDb } from "./helpers";

// Transmission des devis : numérotation provisoire D-AAAA-NNNN, photographies, droits, états.

let t: TestDb;
let customerA: string;
let customerB: string;
let year: string;
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params);

type Who = "alice" | "bob" | "carol" | "dave" | "erin" | "frank";

const line = [
  { description: "Prestation", quantity: "2", unit_label: "jour", unit_price: "1500" },
];

async function draft(
  actor: Who,
  company: string,
  customer: string,
  opts: { issue?: string; until?: string; lines?: unknown[] } = {},
) {
  const r = await asUser(t.db, actor, () =>
    q<{ id: string }>(
      `select public.save_quote_draft($1, $2, $3::jsonb, ${opts.issue ?? "current_date"}, ${
        opts.until ?? "current_date + 30"
      }) as id`,
      [company, customer, JSON.stringify(opts.lines ?? line)],
    ),
  );
  return r.rows[0].id;
}

const send = (actor: Who, company: string, quote: string) =>
  asUser(t.db, actor, () =>
    q<{ n: string }>(`select public.send_quote($1, $2) as n`, [company, quote]),
  );

beforeAll(async () => {
  t = await seed(await createMigratedDb());
  year = (
    await q<{ y: string }>(
      `select extract(year from now() at time zone 'Africa/Ouagadougou')::int::text as y`,
    )
  ).rows[0].y;

  customerA = (
    await asUser(t.db, "alice", () =>
      q<{ id: string }>(
        `insert into public.customers (company_id, name, email, city) values ($1, 'Client transmis A', 'a@exemple.test', 'Ouagadougou') returning id`,
        [t.companyA],
      ),
    )
  ).rows[0].id;
  customerB = (
    await asUser(t.db, "bob", () =>
      q<{ id: string }>(
        `insert into public.customers (company_id, name) values ($1, 'Client transmis B') returning id`,
        [t.companyB],
      ),
    )
  ).rows[0].id;

  // erin devient commerciale de l'entreprise A (droit de transmission).
  await asUser(t.db, "alice", () =>
    q(`update public.company_memberships set role_code = 'sales_purchasing' where user_id = $1 and company_id = $2`, [
      ids.erin,
      t.companyA,
    ]),
  );
});
afterAll(async () => {
  await t.db.close();
});

describe("Devis — transmission et numérotation", () => {
  it("numérote D-AAAA-NNNN, de façon continue, sans réutiliser un numéro", async () => {
    const a = await send("erin", t.companyA, await draft("erin", t.companyA, customerA));
    const b = await send("alice", t.companyA, await draft("alice", t.companyA, customerA));
    expect(a.rows[0].n).toBe(`D-${year}-0001`);
    expect(b.rows[0].n).toBe(`D-${year}-0002`);
  });

  it("chaque entreprise a sa propre séquence", async () => {
    const n = await send("bob", t.companyB, await draft("bob", t.companyB, customerB));
    expect(n.rows[0].n).toBe(`D-${year}-0001`);
  });

  it("une transmission refusée ne consomme aucun numéro", async () => {
    const before = await q<{ v: number }>(
      `select coalesce(max(last_value), 0)::int as v from public.quote_number_counters where company_id = $1`,
      [t.companyA],
    );
    const id = await draft("alice", t.companyA, customerA);
    await expect(send("carol", t.companyA, id)).rejects.toThrow(/permission/i);
    const after = await q<{ v: number }>(
      `select coalesce(max(last_value), 0)::int as v from public.quote_number_counters where company_id = $1`,
      [t.companyA],
    );
    expect(after.rows[0].v).toBe(before.rows[0].v);
    const ok = await send("alice", t.companyA, id);
    expect(ok.rows[0].n).toBe(`D-${year}-${String(before.rows[0].v + 1).padStart(4, "0")}`);
  });

  it.each(["carol", "dave"] as const)("%s (finance, employé) ne peut pas transmettre", async (who) => {
    const id = await draft("alice", t.companyA, customerA);
    await expect(send(who, t.companyA, id)).rejects.toThrow(/permission/i);
  });

  it("un utilisateur d'une autre entreprise ne peut pas transmettre, même avec les bons identifiants", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await expect(send("bob", t.companyA, id)).rejects.toThrow(/permission/i);
    await expect(send("bob", t.companyB, id)).rejects.toThrow(/introuvable/i);
  });

  it("un devis déjà transmis ne peut pas l'être deux fois", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await send("alice", t.companyA, id);
    await expect(send("alice", t.companyA, id)).rejects.toThrow(/brouillon/i);
  });

  it("refuse un devis dont la validité est dépassée", async () => {
    const id = await draft("alice", t.companyA, customerA, {
      issue: "current_date - 40",
      until: "current_date - 10",
    });
    await expect(send("alice", t.companyA, id)).rejects.toThrow(/validité/i);
  });

  it("refuse un client archivé", async () => {
    const c = (
      await asUser(t.db, "alice", () =>
        q<{ id: string }>(`insert into public.customers (company_id, name) values ($1, 'Client à archiver') returning id`, [t.companyA]),
      )
    ).rows[0].id;
    const id = await draft("alice", t.companyA, c);
    await asUser(t.db, "alice", () => q(`update public.customers set status = 'archived' where id = $1`, [c]));
    await expect(send("alice", t.companyA, id)).rejects.toThrow(/client actif/i);
  });

  it("fige les données du client et de l'émetteur au moment de la transmission", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await send("alice", t.companyA, id);
    await asUser(t.db, "alice", () =>
      q(`update public.customers set name = 'Nom modifié après coup' where id = $1`, [customerA]),
    );
    const r = await q<{ status: string; sent_by: string; c: string; fiscal: string }>(
      `select status, sent_by, customer_snapshot->>'name' as c, issuer_snapshot->>'fiscal_profile_status' as fiscal
       from public.quotes where id = $1`,
      [id],
    );
    expect(r.rows[0]).toMatchObject({
      status: "sent",
      sent_by: ids.alice,
      c: "Client transmis A",
      fiscal: "not_configured",
    });
  });

  it("un devis transmis n'est plus modifiable", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await send("alice", t.companyA, id);
    await expect(
      asUser(t.db, "alice", () =>
        q(`select public.save_quote_draft($1, $2, $3::jsonb, current_date, current_date + 30, $4)`, [
          t.companyA,
          customerA,
          JSON.stringify(line),
          id,
        ]),
      ),
    ).rejects.toThrow(/non modifiable|introuvable/i);
  });

  it("journalise la transmission avec le numéro", async () => {
    const id = await draft("alice", t.companyA, customerA);
    const n = (await send("alice", t.companyA, id)).rows[0].n;
    const e = await q<{ number: string }>(
      `select metadata->>'quote_number' as number from public.audit_events
       where entity_id = $1 and action = 'quotes.sent'`,
      [id],
    );
    expect(e.rows.map((r) => r.number)).toEqual([n]);
  });
});

describe("Devis — protections directes en base", () => {
  it("aucun changement de statut ni de numéro par écriture directe", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await expect(
      asUser(t.db, "alice", () => q(`update public.quotes set status = 'sent', quote_number = 'D-2026-9999' where id = $1`, [id])),
    ).rejects.toThrow(/permission denied/i);
  });

  it("les compteurs ne sont pas accessibles aux utilisateurs", async () => {
    await expect(
      asUser(t.db, "alice", () => q(`select * from public.quote_number_counters`)),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(t.db, "alice", () =>
        q(`insert into public.quote_number_counters (company_id, numbering_year, last_value) values ($1, 2099, 1)`, [t.companyA]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("la base refuse un devis non brouillon sans numéro ni photographie", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await expect(q(`update public.quotes set status = 'sent' where id = $1`, [id])).rejects.toThrow(
      /quotes_non_draft_complete_check|violates check/i,
    );
  });

  it("la base refuse un numéro au mauvais format", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await expect(q(`update public.quotes set quote_number = 'X-1' where id = $1`, [id])).rejects.toThrow(
      /quotes_number_format_check|violates check/i,
    );
  });

  it("un anonyme ne peut pas exécuter la fonction", async () => {
    const id = await draft("alice", t.companyA, customerA);
    await q(`set role anon`);
    try {
      await expect(q(`select public.send_quote($1, $2)`, [t.companyA, id])).rejects.toThrow(/permission denied/i);
    } finally {
      await q(`reset role`);
    }
  });
});
