import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { asAnon, asUser, createMigratedDb, ids, seed, type TestDb } from './helpers'

// Audit de la gestion des membres : cas non couverts par isolation.test.ts
// (rôles sans droit d'invitation, entreprise étrangère, anonyme, compte désactivé, e-mail).

let t: TestDb
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params)

beforeAll(async () => {
  t = await seed(await createMigratedDb())
})
afterAll(async () => {
  await t.db.close()
})

async function createUser(status?: 'disabled') {
  const id = (await q<{ id: string }>('select gen_random_uuid()::text as id')).rows[0].id
  const email = `Audit-${id}@Example.Test`
  await q('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [
    id,
    email,
    JSON.stringify({ full_name: 'Compte audit' }),
  ])
  if (status) await q('update public.users set status = $2 where id = $1', [id, status])
  return { id, email }
}

const invite = (who: keyof typeof ids, company: string, email: string, role: string) =>
  asUser(t.db, who, () =>
    q('select public.invite_existing_company_member($1, $2, $3)', [company, email, role]),
  )

describe('Invitation : qui peut inviter', () => {
  it.each(['carol', 'dave', 'erin'] as const)(
    '%s (finance, employé, auditeur) ne peut pas inviter',
    async (who) => {
      const target = await createUser()
      await expect(invite(who, t.companyA, target.email, 'employee')).rejects.toThrow(
        /permission de gestion des membres requise/,
      )
      const m = await q('select 1 from public.company_memberships where user_id = $1', [target.id])
      expect(m.rows).toHaveLength(0)
    },
  )

  it("un administrateur de l'entreprise A ne peut pas inviter dans l'entreprise B", async () => {
    const target = await createUser()
    await expect(invite('frank', t.companyB, target.email, 'employee')).rejects.toThrow(
      /permission de gestion des membres requise/,
    )
  })

  it("le propriétaire de l'entreprise B ne peut pas lister les membres de A", async () => {
    await expect(
      asUser(t.db, 'bob', () => q('select * from public.list_company_members($1)', [t.companyA])),
    ).rejects.toThrow(/accès refusé/)
  })

  it('un anonyme ne peut exécuter aucune des deux fonctions', async () => {
    const target = await createUser()
    await expect(
      asAnon(t.db, () =>
        q('select public.invite_existing_company_member($1, $2, $3)', [
          t.companyA,
          target.email,
          'employee',
        ]),
      ),
    ).rejects.toThrow(/permission denied/)
    await expect(
      asAnon(t.db, () => q('select * from public.list_company_members($1)', [t.companyA])),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('Invitation : cible et rôle', () => {
  it("l'adresse e-mail est comparée sans tenir compte de la casse ni des espaces", async () => {
    const target = await createUser()
    await invite('frank', t.companyA, `  ${target.email.toLowerCase()}  `, 'employee')
    const m = await q<{ status: string }>(
      'select status from public.company_memberships where user_id = $1',
      [target.id],
    )
    expect(m.rows).toEqual([{ status: 'invited' }])
  })

  it('un compte désactivé ne peut pas être invité', async () => {
    const target = await createUser('disabled')
    await expect(invite('frank', t.companyA, target.email, 'employee')).rejects.toThrow(
      /aucun compte actif/,
    )
  })

  it("on ne peut pas s'inviter soi-même, même propriétaire", async () => {
    const alice = await q<{ email: string }>('select email from auth.users where id = $1', [ids.alice])
    await expect(invite('alice', t.companyA, alice.rows[0].email, 'employee')).rejects.toThrow(
      /soi-même|déjà une appartenance/,
    )
  })

  it('un rôle inexistant est refusé', async () => {
    const target = await createUser()
    await expect(invite('frank', t.companyA, target.email, 'superadmin')).rejects.toThrow(
      /rôle invalide/,
    )
  })

  it("une invitation n'accorde aucun accès tant qu'elle n'est pas activée", async () => {
    const target = await createUser()
    await invite('frank', t.companyA, target.email, 'finance')
    await q(`select set_config('request.jwt.claim.sub', $1, false)`, [target.id])
    await q('set role authenticated')
    try {
      const rows = await q('select id from public.companies')
      const customers = await q('select id from public.customers')
      expect(rows.rows).toHaveLength(0)
      expect(customers.rows).toHaveLength(0)
    } finally {
      await q('reset role')
    }
  })
})
