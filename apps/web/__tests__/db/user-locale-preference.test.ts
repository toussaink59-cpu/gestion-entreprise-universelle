import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDb, ids, seed, type TestDb } from "./helpers";

let t: TestDb;
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params);

beforeAll(async () => {
  t = await seed(await createMigratedDb());
});

afterAll(async () => {
  await t.db.close();
});

describe("préférence de langue du profil", () => {
  it("crée les profils existants avec le français par défaut", async () => {
    const result = await asUser(t.db, "alice", () =>
      q<{ preferred_locale: string }>(
        "select preferred_locale from public.users where id = $1",
        [ids.alice],
      ),
    );

    expect(result.rows).toEqual([{ preferred_locale: "fr" }]);
  });

  it("permet à l’utilisateur de changer uniquement sa propre préférence", async () => {
    const result = await asUser(t.db, "alice", () =>
      q(
        "update public.users set preferred_locale = 'en' where id = $1",
        [ids.alice],
      ),
    );

    expect(result.affectedRows).toBe(1);
    const saved = await q<{ preferred_locale: string }>(
      "select preferred_locale from public.users where id = $1",
      [ids.alice],
    );
    expect(saved.rows[0].preferred_locale).toBe("en");
  });

  it("n’autorise pas à modifier la préférence d’un autre profil", async () => {
    const result = await asUser(t.db, "alice", () =>
      q(
        "update public.users set preferred_locale = 'en' where id = $1",
        [ids.bob],
      ),
    );

    expect(result.affectedRows).toBe(0);
    const bob = await q<{ preferred_locale: string }>(
      "select preferred_locale from public.users where id = $1",
      [ids.bob],
    );
    expect(bob.rows[0].preferred_locale).toBe("fr");
  });

  it("refuse les locales non prises en charge", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q("update public.users set preferred_locale = 'de' where id = $1", [ids.alice]),
      ),
    ).rejects.toThrow(/check constraint|violates/i);
  });

  it("ne permet pas de modifier les champs protégés du profil", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q("update public.users set status = 'disabled' where id = $1", [ids.alice]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});
