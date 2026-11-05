import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDb, ids, seed, type TestDb } from "./helpers";

// Réponse du client (accepté / refusé) et annulation d'un devis transmis.

let t: TestDb;
let customerA: string;
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params);

type Who = "alice" | "bob" | "carol" | "dave" | "erin" | "frank";

const lines = [{ description: "Prestation", quantity: "1", unit_label: "forfait", unit_price: "5000" }];

async function sentQuote(): Promise<string> {
  const d = await asUser(t.db, "alice", () =>
    q<{ id: string }>(
      `select public.save_quote_draft($1, $2, $3::jsonb, current_date, current_date + 30) as id`,
      [t.companyA, customerA, JSON.stringify(lines)],
    ),
  );
  const id = d.rows[0].id;
  await asUser(t.db, "alice", () => q(`select public.send_quote($1, $2)`, [t.companyA, id]));
  return id;
}

const respond = (who: Who, company: string, quote: string, decision: string, method: string | null = "email", ref: string | null = "Courriel du 5 nov.") =>
  asUser(t.db, who, () =>
    q(`select public.record_quote_response($1, $2, $3, $4, $5)`, [company, quote, decision, method, ref]),
  );

const cancel = (who: Who, company: string, quote: string, reason: string | null = "Erreur de prix") =>
  asUser(t.db, who, () => q(`select public.cancel_quote($1, $2, $3)`, [company, quote, reason]));

const state = async (id: string) =>
  (
    await q<{ status: string; by: string | null; method: string | null; ref: string | null; reason: string | null }>(
      `select status, coalesce(accepted_by, rejected_by, cancelled_by)::text as by,
              acceptance_method as method, acceptance_reference as ref, cancellation_reason as reason
       from public.quotes where id = $1`,
      [id],
    )
  ).rows[0];

beforeAll(async () => {
  t = await seed(await createMigratedDb());
  customerA = (
    await asUser(t.db, "alice", () =>
      q<{ id: string }>(`insert into public.customers (company_id, name) values ($1, 'Client réponse') returning id`, [t.companyA]),
    )
  ).rows[0].id;
  await asUser(t.db, "alice", () =>
    q(`update public.company_memberships set role_code = 'sales_purchasing' where user_id = $1 and company_id = $2`, [ids.erin, t.companyA]),
  );
});
afterAll(async () => {
  await t.db.close();
});

describe("Devis — réponse du client", () => {
  it("le commercial enregistre une acceptation avec méthode et référence", async () => {
    const id = await sentQuote();
    await respond("erin", t.companyA, id, "accepted", "whatsapp", "Message WhatsApp du 5 nov.");
    expect(await state(id)).toMatchObject({
      status: "accepted",
      by: ids.erin,
      method: "whatsapp",
      ref: "Message WhatsApp du 5 nov.",
    });
  });

  it("une acceptation exige une référence de preuve et une méthode valide", async () => {
    const id = await sentQuote();
    await expect(respond("erin", t.companyA, id, "accepted", "email", null)).rejects.toThrow(/référence/i);
    await expect(respond("erin", t.companyA, id, "accepted", "email", "   ")).rejects.toThrow(/référence/i);
    await expect(respond("erin", t.companyA, id, "accepted", null, "x")).rejects.toThrow(/méthode/i);
    await expect(respond("erin", t.companyA, id, "accepted", "pigeon", "x")).rejects.toThrow(/méthode/i);
    expect((await state(id)).status).toBe("sent");
  });

  it("un refus est possible sans référence", async () => {
    const id = await sentQuote();
    await respond("erin", t.companyA, id, "rejected", null, null);
    expect(await state(id)).toMatchObject({ status: "rejected", by: ids.erin });
  });

  it("refuse une décision inconnue", async () => {
    const id = await sentQuote();
    await expect(respond("erin", t.companyA, id, "maybe")).rejects.toThrow(/décision/i);
  });

  it("un brouillon ne peut pas recevoir de réponse", async () => {
    const d = await asUser(t.db, "alice", () =>
      q<{ id: string }>(`select public.save_quote_draft($1, $2, $3::jsonb, current_date, current_date + 30) as id`, [
        t.companyA, customerA, JSON.stringify(lines),
      ]),
    );
    await expect(respond("alice", t.companyA, d.rows[0].id, "accepted")).rejects.toThrow(/transmis/i);
  });

  it("une réponse déjà donnée est définitive", async () => {
    const id = await sentQuote();
    await respond("erin", t.companyA, id, "rejected", null, null);
    await expect(respond("erin", t.companyA, id, "accepted")).rejects.toThrow(/transmis/i);
    expect((await state(id)).status).toBe("rejected");
  });

  it("un devis expiré ne peut plus être accepté, mais peut être refusé", async () => {
    const expired = await sentQuote();
    await q(`update public.quotes set issue_date = current_date - 40, valid_until = current_date - 10 where id = $1`, [expired]);
    await expect(respond("erin", t.companyA, expired, "accepted")).rejects.toThrow(/expiré/i);
    await respond("erin", t.companyA, expired, "rejected", null, null);
    expect((await state(expired)).status).toBe("rejected");
  });

  it.each(["carol", "dave"] as const)("%s (finance, employé) ne peut pas enregistrer de réponse", async (who) => {
    const id = await sentQuote();
    await expect(respond(who, t.companyA, id, "accepted")).rejects.toThrow(/permission/i);
    expect((await state(id)).status).toBe("sent");
  });

  it("une autre entreprise ne peut pas répondre, même avec les identifiants", async () => {
    const id = await sentQuote();
    await expect(respond("bob", t.companyA, id, "accepted")).rejects.toThrow(/permission/i);
    await expect(respond("bob", t.companyB, id, "accepted")).rejects.toThrow(/introuvable/i);
  });

  it("journalise la réponse", async () => {
    const id = await sentQuote();
    await respond("erin", t.companyA, id, "accepted");
    const e = await q<{ action: string }>(
      `select action from public.audit_events where entity_id = $1 and action = 'quotes.accepted'`,
      [id],
    );
    expect(e.rows).toHaveLength(1);
  });
});

describe("Devis — annulation d'un devis transmis", () => {
  it("le propriétaire annule avec un motif", async () => {
    const id = await sentQuote();
    await cancel("alice", t.companyA, id, "Erreur de prix");
    expect(await state(id)).toMatchObject({ status: "cancelled", by: ids.alice, reason: "Erreur de prix" });
  });

  it("l'administrateur peut annuler", async () => {
    const id = await sentQuote();
    await cancel("frank", t.companyA, id, "Client perdu");
    expect((await state(id)).status).toBe("cancelled");
  });

  it("le commercial, la finance et l'employé ne peuvent pas annuler", async () => {
    const id = await sentQuote();
    for (const who of ["erin", "carol", "dave"] as const) {
      await expect(cancel(who, t.companyA, id)).rejects.toThrow(/permission/i);
    }
    expect((await state(id)).status).toBe("sent");
  });

  it("le motif est obligatoire (3 à 500 caractères)", async () => {
    const id = await sentQuote();
    await expect(cancel("alice", t.companyA, id, null)).rejects.toThrow(/motif/i);
    await expect(cancel("alice", t.companyA, id, "  a ")).rejects.toThrow(/motif/i);
    await expect(cancel("alice", t.companyA, id, "x".repeat(501))).rejects.toThrow(/motif/i);
  });

  it("un devis accepté ne peut pas être annulé, ni un devis annulé recevoir une réponse", async () => {
    const accepted = await sentQuote();
    await respond("erin", t.companyA, accepted, "accepted");
    await expect(cancel("alice", t.companyA, accepted)).rejects.toThrow(/transmis/i);

    const cancelled = await sentQuote();
    await cancel("alice", t.companyA, cancelled);
    await expect(respond("erin", t.companyA, cancelled, "accepted")).rejects.toThrow(/transmis/i);
  });

  it("une autre entreprise ne peut pas annuler", async () => {
    const id = await sentQuote();
    await expect(cancel("bob", t.companyA, id)).rejects.toThrow(/permission/i);
    await expect(cancel("bob", t.companyB, id)).rejects.toThrow(/introuvable/i);
  });
});

describe("Devis — protections directes en base", () => {
  it("aucun changement d'état par écriture directe", async () => {
    const id = await sentQuote();
    await expect(
      asUser(t.db, "alice", () => q(`update public.quotes set status = 'accepted' where id = $1`, [id])),
    ).rejects.toThrow(/permission denied/i);
  });

  it("la base refuse un état accepté, refusé ou annulé incomplet", async () => {
    const id = await sentQuote();
    await expect(q(`update public.quotes set status = 'accepted' where id = $1`, [id])).rejects.toThrow(/quotes_accepted_complete_check|violates check/i);
    await expect(q(`update public.quotes set status = 'rejected' where id = $1`, [id])).rejects.toThrow(/quotes_rejected_complete_check|violates check/i);
    await expect(q(`update public.quotes set status = 'cancelled' where id = $1`, [id])).rejects.toThrow(/quotes_cancelled_complete_check|violates check/i);
  });

  it("un anonyme ne peut exécuter aucune des deux fonctions", async () => {
    const id = await sentQuote();
    await q(`set role anon`);
    try {
      await expect(q(`select public.record_quote_response($1, $2, 'rejected')`, [t.companyA, id])).rejects.toThrow(/permission denied/i);
      await expect(q(`select public.cancel_quote($1, $2, 'motif')`, [t.companyA, id])).rejects.toThrow(/permission denied/i);
    } finally {
      await q(`reset role`);
    }
  });
});
