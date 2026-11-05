import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDb, ids, seed, type TestDb } from "./helpers";

// Appels directs de la fonction (hors interface) avec des valeurs numériques spéciales.

let t: TestDb;
let customerId: string;
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params);

beforeAll(async () => {
  t = await seed(await createMigratedDb());
  const c = await asUser(t.db, "alice", () =>
    q<{ id: string }>(
      `insert into public.customers (company_id, name) values ($1, 'Client valeurs') returning id`,
      [t.companyA],
    ),
  );
  customerId = c.rows[0].id;
});
afterAll(async () => {
  await t.db.close();
});

const save = (line: Record<string, string>) =>
  asUser(t.db, "alice", () =>
    q<{ id: string }>(
      `select public.save_quote_draft($1, $2, $3::jsonb, current_date, current_date + 30) as id`,
      [
        t.companyA,
        customerId,
        JSON.stringify([
          { description: "Prestation", unit_label: "u", quantity: "1", unit_price: "100", ...line },
        ]),
      ],
    ),
  );

describe("Devis — valeurs numériques spéciales refusées en base", () => {
  it.each([
    ["quantité NaN", { quantity: "NaN" }],
    ["prix unitaire NaN", { unit_price: "NaN" }],
    ["quantité infinie", { quantity: "Infinity" }],
    ["prix unitaire infini", { unit_price: "Infinity" }],
  ])("%s", async (_label, line) => {
    await expect(save(line)).rejects.toThrow();
    const n = await q<{ n: string }>(
      `select count(*)::text as n from public.quotes where total_amount = 'NaN'::numeric`,
    );
    expect(n.rows[0].n).toBe("0");
  });

  it("une ligne valide reste acceptée avec le bon total", async () => {
    const r = await save({ quantity: "2", unit_price: "1500" });
    const tot = await q<{ total_amount: string }>(
      `select total_amount::text from public.quotes where id = $1`,
      [r.rows[0].id],
    );
    expect(Number(tot.rows[0].total_amount)).toBe(3000);
  });

  it("la contrainte de table refuse aussi un NaN écrit sans passer par la fonction", async () => {
    await expect(
      q(
        `insert into public.quotes (company_id, customer_id, issue_date, valid_until, currency_code, subtotal_amount, total_amount, created_by, updated_by)
         values ($1, $2, current_date, current_date + 1, 'XOF', 'NaN'::numeric, 'NaN'::numeric, $3, $3)`,
        [t.companyA, customerId, ids.alice],
      ),
    ).rejects.toThrow(/quotes_amounts_finite_check|violates check/);
  });
});
