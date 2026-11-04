import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUserId,
  createMigratedDb,
  seed,
  type TestDb,
} from "./helpers";

let t: TestDb;

const q = <R extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => t.db.query<R>(sql, params);

beforeAll(async () => {
  t = await seed(await createMigratedDb());
});

afterAll(async () => {
  await t.db.close();
});

async function createUser() {
  const id = (
    await q<{ id: string }>(
      "select gen_random_uuid()::text as id",
    )
  ).rows[0].id;

  await q(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [
      id,
      `company-owner-${id}@example.test`,
      JSON.stringify({ full_name: "Propriétaire entreprise" }),
    ],
  );

  return id;
}

async function createCompany(
  userId: string,
  name: string,
  tradeName?: string,
) {
  return asUserId(t.db, userId, async () => {
    const result = await q<{ id: string }>(
      "select public.create_company($1::text, $2::text) as id",
      [name, tradeName ?? null],
    );

    return result.rows[0].id;
  });
}

describe("Création d'entreprises — périmètre MVP", () => {
  it("autorise plus de cinq entreprises pour un même propriétaire", async () => {
    const userId = await createUser();

    for (let i = 1; i <= 8; i++) {
      await expect(
        createCompany(userId, `Entreprise MVP ${i}`),
      ).resolves.toBeTruthy();
    }

    const result = await q<{ total: string }>(
      `select count(*)::text as total
       from public.company_memberships
       where user_id = $1
         and role_code = 'owner'
         and status = 'active'`,
      [userId],
    );

    expect(result.rows[0].total).toBe("8");
  });

  it("n'impose pas de plafond global partagé entre utilisateurs", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();

    for (let i = 1; i <= 6; i++) {
      await createCompany(firstUser, `Entreprise propriétaire 1 - ${i}`);
      await createCompany(secondUser, `Entreprise propriétaire 2 - ${i}`);
    }

    const result = await q<{ total: string }>(
      `select count(*)::text as total
       from public.company_memberships
       where user_id = any($1::uuid[])
         and role_code = 'owner'
         and status = 'active'`,
      [[firstUser, secondUser]],
    );

    expect(result.rows[0].total).toBe("12");
  });

  it("refuse une raison sociale de moins de deux caractères", async () => {
    const userId = await createUser();

    await expect(
      createCompany(userId, "A"),
    ).rejects.toThrow(/raison sociale invalide/);
  });

  it("refuse un nom commercial de moins de deux caractères", async () => {
    const userId = await createUser();

    await expect(
      createCompany(userId, "Entreprise valide", "A"),
    ).rejects.toThrow(/nom commercial invalide/);
  });
});
