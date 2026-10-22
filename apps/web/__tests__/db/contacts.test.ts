import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createMigratedDb,
  ids,
  seed,
  type TestDb,
} from "./helpers";

const DENIED = /row-level security|permission denied|violates/i;

let t: TestDb;

const q = <R extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => t.db.query<R>(sql, params);

beforeAll(async () => {
  t = await seed(await createMigratedDb());

  await asUser(t.db, "alice", async () => {
    await q(
      `insert into public.customers (company_id, name, email)
       values ($1, $2, $3)`,
      [t.companyA, "Client initial A", "client-a@example.test"],
    );

    await q(
      `insert into public.suppliers (company_id, name, email)
       values ($1, $2, $3)`,
      [t.companyA, "Fournisseur initial A", "fournisseur-a@example.test"],
    );

    await q(
      `update public.company_memberships
       set role_code = 'sales_purchasing'
       where user_id = $1`,
      [ids.erin],
    );
  });
});

afterAll(async () => {
  await t.db.close();
});

describe("Clients et fournisseurs — isolation multi-entreprises", () => {
  it("un propriétaire ne voit pas les clients d'une autre entreprise", async () => {
    const own = await asUser(t.db, "alice", () =>
      q<{ company_id: string }>(
        `select company_id from public.customers
         where name = $1`,
        ["Client initial A"],
      ),
    );

    const foreign = await asUser(t.db, "bob", () =>
      q(
        `select * from public.customers
         where name = $1`,
        ["Client initial A"],
      ),
    );

    expect(own.rows.map((row) => row.company_id)).toEqual([t.companyA]);
    expect(foreign.rows).toHaveLength(0);
  });

  it("un propriétaire ne voit pas les fournisseurs d'une autre entreprise", async () => {
    const own = await asUser(t.db, "alice", () =>
      q<{ company_id: string }>(
        `select company_id from public.suppliers
         where name = $1`,
        ["Fournisseur initial A"],
      ),
    );

    const foreign = await asUser(t.db, "bob", () =>
      q(
        `select * from public.suppliers
         where name = $1`,
        ["Fournisseur initial A"],
      ),
    );

    expect(own.rows.map((row) => row.company_id)).toEqual([t.companyA]);
    expect(foreign.rows).toHaveLength(0);
  });

  it("refuse de créer un client dans une autre entreprise", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(
          `insert into public.customers (company_id, name)
           values ($1, $2)`,
          [t.companyB, "Client interdit"],
        ),
      ),
    ).rejects.toThrow(DENIED);
  });

  it("refuse de créer un fournisseur dans une autre entreprise", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(
          `insert into public.suppliers (company_id, name)
           values ($1, $2)`,
          [t.companyB, "Fournisseur interdit"],
        ),
      ),
    ).rejects.toThrow(DENIED);
  });
});

describe("Clients et fournisseurs — permissions par rôle", () => {
  it("la finance peut lire les contacts mais pas les modifier", async () => {
    const customers = await asUser(t.db, "carol", () =>
      q(
        `select id from public.customers
         where name = $1`,
        ["Client initial A"],
      ),
    );

    expect(customers.rows).toHaveLength(1);

    await expect(
      asUser(t.db, "carol", () =>
        q(
          `insert into public.customers (company_id, name)
           values ($1, $2)`,
          [t.companyA, "Client interdit finance"],
        ),
      ),
    ).rejects.toThrow(DENIED);

    const update = await asUser(t.db, "carol", () =>
      q(
        `update public.customers
         set name = $1
         where name = $2`,
        ["Modification interdite", "Client initial A"],
      ),
    );

    expect(update.affectedRows).toBe(0);
  });

  it("un employé sans permission commerciale ne voit pas les contacts", async () => {
    const customers = await asUser(t.db, "dave", () =>
      q("select * from public.customers"),
    );

    const suppliers = await asUser(t.db, "dave", () =>
      q("select * from public.suppliers"),
    );

    expect(customers.rows).toHaveLength(0);
    expect(suppliers.rows).toHaveLength(0);
  });

  it("le commercial peut créer puis archiver un client et un fournisseur", async () => {
    const result = await asUser(t.db, "erin", async () => {
      await q(
        `insert into public.customers (company_id, name, email)
         values ($1, $2, $3)`,
        [t.companyA, "Client commercial", "commercial@example.test"],
      );

      await q(
        `insert into public.suppliers (company_id, name, email)
         values ($1, $2, $3)`,
        [t.companyA, "Fournisseur commercial", "achat@example.test"],
      );

      const customerUpdate = await q(
        `update public.customers
         set name = $1, status = 'archived'
         where company_id = $2 and name = $3`,
        ["Client commercial modifié", t.companyA, "Client commercial"],
      );

      const customers = await q<{ name: string; status: string }>(
        `select name, status from public.customers
         where company_id = $1 and name = $2`,
        [t.companyA, "Client commercial modifié"],
      );

      const supplierUpdate = await q(
        `update public.suppliers
         set name = $1, status = 'archived'
         where company_id = $2 and name = $3`,
        ["Fournisseur commercial modifié", t.companyA, "Fournisseur commercial"],
      );

      const suppliers = await q<{ name: string; status: string }>(
        `select name, status from public.suppliers
         where company_id = $1 and name = $2`,
        [t.companyA, "Fournisseur commercial modifié"],
      );

      return { customerUpdate, customers, supplierUpdate, suppliers };
    });

    expect(result.customerUpdate.affectedRows).toBe(1);
    expect(result.customers.rows).toEqual([
      { name: "Client commercial modifié", status: "archived" },
    ]);
    expect(result.supplierUpdate.affectedRows).toBe(1);
    expect(result.suppliers.rows).toEqual([
      { name: "Fournisseur commercial modifié", status: "archived" },
    ]);
  });
});

describe("Clients et fournisseurs — audit et intégrité", () => {
  it("journalise les champs modifiés sans enregistrer les valeurs privées", async () => {
    const audit = await asUser(t.db, "alice", () =>
      q<{ action: string; metadata: Record<string, unknown> }>(
        `select action, metadata from public.audit_events
         where company_id = $1 and entity_type = 'customers'
         and entity_id = (
           select id from public.customers
           where name = $2 and status = 'archived'
         )
         order by created_at, action`,
        [t.companyA, "Client commercial modifié"],
      ),
    );

    const created = audit.rows.find(
      (row) => row.action === "customers.created",
    );
    const updated = audit.rows.find(
      (row) => row.action === "customers.updated",
    );

    expect(created).toBeDefined();
    expect(updated).toBeDefined();
    expect(updated?.metadata).toMatchObject({
      changed_fields: expect.arrayContaining(["name", "status"]),
    });

    const metadataText = JSON.stringify(audit.rows.map((row) => row.metadata));
    expect(metadataText).not.toContain("commercial@example.test");
    expect(metadataText).not.toContain("Client commercial modifié");
  });

  it("refuse la suppression définitive par un utilisateur connecté", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(
          `delete from public.customers where name = $1`,
          ["Client initial A"],
        ),
      ),
    ).rejects.toThrow(DENIED);

    await expect(
      asUser(t.db, "alice", () =>
        q(
          `delete from public.suppliers where name = $1`,
          ["Fournisseur initial A"],
        ),
      ),
    ).rejects.toThrow(DENIED);
  });
});
