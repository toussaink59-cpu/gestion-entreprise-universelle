
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
      `quota-${id}@example.test`,
      JSON.stringify({ full_name: "Utilisateur quota" }),
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

describe("Anti-abus : limite de création des entreprises", () => {
  it("autorise cinq entreprises et refuse la sixième", async () => {
    const userId = await createUser();

    for (let i = 1; i <= 5; i++) {
      await createCompany(userId, `Entreprise quota ${i}`);
    }

    await expect(
      createCompany(userId, "Entreprise quota 6"),
    ).rejects.toThrow(/limite du nombre/);

    const result = await q<{ total: string }>(
      `select count(*)::text as total
       from public.company_memberships
       where user_id = $1
         and role_code = 'owner'
         and status = 'active'`,
      [userId],
    );

    expect(result.rows[0].total).toBe("5");
  });

  it("applique le plafond indépendamment à chaque utilisateur", async () => {
    const firstUser = await createUser();

    for (let i = 1; i <= 5; i++) {
      await createCompany(
        firstUser,
        `Entreprise utilisateur 1 - ${i}`,
      );
    }

    await expect(
      createCompany(firstUser, "Entreprise utilisateur 1 - 6"),
    ).rejects.toThrow(/limite du nombre/);

    const secondUser = await createUser();

    const companyId = await createCompany(
      secondUser,
      "Entreprise utilisateur 2",
    );

    expect(companyId).toBeTruthy();
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
