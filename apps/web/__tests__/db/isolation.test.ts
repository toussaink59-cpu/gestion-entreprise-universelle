import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { asAnon, asUser, createMigratedDb, ids, seed, type TestDb } from './helpers'

// Tests contre un vrai moteur PostgreSQL : migrations rejouées, politiques RLS réelles.
// ACC-01 (isolation), ACC-05 (permissions), ACC-06 (audit), SEC-02, SEC-05.

const DENIED = /row-level security|permission denied|violates/i

let t: TestDb
const q = <R extends object = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  t.db.query<R>(sql, params)

beforeAll(async () => {
  t = await seed(await createMigratedDb())
})
afterAll(async () => {
  await t.db.close()
})

describe('ACC-01 — isolation entre deux entreprises', () => {
  it('chaque propriétaire ne voit que sa propre entreprise', async () => {
    const a = await asUser(t.db, 'alice', () => q<{ id: string }>('select id from public.companies'))
    const b = await asUser(t.db, 'bob', () => q<{ id: string }>('select id from public.companies'))
    expect(a.rows.map((r) => r.id)).toEqual([t.companyA])
    expect(b.rows.map((r) => r.id)).toEqual([t.companyB])
  })

  it('accès par identifiant direct à une autre entreprise : aucune ligne', async () => {
    const r = await asUser(t.db, 'alice', () => q('select * from public.companies where id = $1', [t.companyB]))
    expect(r.rows).toHaveLength(0)
  })

  it('modification d\'une autre entreprise : aucune ligne modifiée', async () => {
    const r = await asUser(t.db, 'alice', () =>
      q(`update public.companies set legal_name = 'Piratée' where id = $1`, [t.companyB]),
    )
    expect(r.affectedRows).toBe(0)
    const check = await q<{ legal_name: string }>('select legal_name from public.companies where id = $1', [t.companyB])
    expect(check.rows[0].legal_name).toBe('Entreprise B')
  })

  it('impossible de s\'ajouter à une autre entreprise, même comme propriétaire', async () => {
    await expect(
      asUser(t.db, 'alice', () =>
        q(`insert into public.company_memberships (company_id, user_id, role_code) values ($1, $2, 'owner')`, [
          t.companyB,
          ids.alice,
        ]),
      ),
    ).rejects.toThrow(DENIED)
  })

  it('impossible d\'ajouter un tiers dans une autre entreprise', async () => {
    await expect(
      asUser(t.db, 'alice', () =>
        q(`insert into public.company_memberships (company_id, user_id, role_code) values ($1, $2, 'employee')`, [
          t.companyB,
          ids.mallory,
        ]),
      ),
    ).rejects.toThrow(DENIED)
  })

  it('appartenances et journal d\'audit de l\'autre entreprise invisibles', async () => {
    const m = await asUser(t.db, 'alice', () =>
      q('select * from public.company_memberships where company_id = $1', [t.companyB]),
    )
    const a = await asUser(t.db, 'alice', () => q('select * from public.audit_events where company_id = $1', [t.companyB]))
    expect(m.rows).toHaveLength(0)
    expect(a.rows).toHaveLength(0)
  })

  it('profils : on ne voit pas les utilisateurs d\'une autre entreprise', async () => {
    const r = await asUser(t.db, 'alice', () => q<{ id: string }>('select id from public.users'))
    const seen = r.rows.map((x) => x.id)
    expect(seen).not.toContain(ids.bob)
    expect(seen).not.toContain(ids.mallory)
    expect(seen).toContain(ids.carol)
  })

  it('un utilisateur sans entreprise ne voit rien', async () => {
    const r = await asUser(t.db, 'mallory', () => q('select * from public.companies'))
    expect(r.rows).toHaveLength(0)
  })

  it('un visiteur non connecté n\'a accès à aucune table', async () => {
    for (const table of ['companies', 'users', 'company_memberships', 'audit_events', 'roles']) {
      await expect(asAnon(t.db, () => q(`select * from public.${table}`))).rejects.toThrow(DENIED)
    }
  })

  it('aucune suppression ni création directe de données sensibles', async () => {
    await expect(asUser(t.db, 'alice', () => q('delete from public.companies'))).rejects.toThrow(DENIED)
    await expect(asUser(t.db, 'alice', () => q('delete from public.company_memberships'))).rejects.toThrow(DENIED)
    await expect(
      asUser(t.db, 'alice', () => q(`insert into public.companies (legal_name) values ('Directe')`)),
    ).rejects.toThrow(DENIED)
  })

  it('create_company exige une session et est refusée aux visiteurs', async () => {
    await expect(asUser(t.db, null, () => q(`select public.create_company('Sans session')`))).rejects.toThrow(
      /authentification requise/,
    )
    await expect(asAnon(t.db, () => q(`select public.create_company('Visiteur')`))).rejects.toThrow(DENIED)
  })

  it('toute table du schéma public a la RLS activée (garde-fou pour les futures migrations)', async () => {
    const r = await q<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(r.rows.map((x) => x.relname)).toEqual([])
  })
})

describe('ACC-05 — permissions par rôle', () => {
  it('un employé ne voit que sa propre appartenance et ne peut rien ajouter', async () => {
    const r = await asUser(t.db, 'dave', () => q<{ user_id: string }>('select user_id from public.company_memberships'))
    expect(r.rows.map((x) => x.user_id)).toEqual([ids.dave])
    await expect(
      asUser(t.db, 'dave', () =>
        q(`insert into public.company_memberships (company_id, user_id, role_code) values ($1, $2, 'employee')`, [
          t.companyA,
          ids.mallory,
        ]),
      ),
    ).rejects.toThrow(DENIED)
  })

  it('un employé ne peut pas lire le journal d\'audit ni modifier l\'entreprise', async () => {
    const audit = await asUser(t.db, 'dave', () => q('select * from public.audit_events'))
    expect(audit.rows).toHaveLength(0)
    const upd = await asUser(t.db, 'dave', () =>
      q(`update public.companies set trade_name = 'X' where id = $1`, [t.companyA]),
    )
    expect(upd.affectedRows).toBe(0)
  })

  it('la finance ne gère pas les membres et ne lit pas l\'audit', async () => {
    const m = await asUser(t.db, 'carol', () => q('select * from public.company_memberships'))
    expect(m.rows).toHaveLength(1)
    const audit = await asUser(t.db, 'carol', () => q('select * from public.audit_events'))
    expect(audit.rows).toHaveLength(0)
  })

  it('l\'auditeur lit le journal de son entreprise mais ne modifie rien', async () => {
    const audit = await asUser(t.db, 'erin', () => q('select * from public.audit_events'))
    expect(audit.rows.length).toBeGreaterThan(0)
    const upd = await asUser(t.db, 'erin', () =>
      q(`update public.company_memberships set role_code = 'owner' where user_id = $1`, [ids.erin]),
    )
    expect(upd.affectedRows).toBe(0)
  })

  it('un administrateur d\'entreprise ne peut pas créer de propriétaire', async () => {
    await expect(
      asUser(t.db, 'frank', () =>
        q(`insert into public.company_memberships (company_id, user_id, role_code) values ($1, $2, 'owner')`, [
          t.companyA,
          ids.mallory,
        ]),
      ),
    ).rejects.toThrow(DENIED)
  })

  it('un administrateur d\'entreprise ne peut pas rétrograder ni révoquer un propriétaire', async () => {
    const r = await asUser(t.db, 'frank', () =>
      q(`update public.company_memberships set status = 'revoked' where user_id = $1`, [ids.alice]),
    )
    expect(r.affectedRows).toBe(0)
    const check = await q<{ status: string }>('select status from public.company_memberships where user_id = $1', [ids.alice])
    expect(check.rows[0].status).toBe('active')
  })

  it('personne ne modifie sa propre appartenance (pas d\'auto-promotion)', async () => {
    const r = await asUser(t.db, 'frank', () =>
      q(`update public.company_memberships set role_code = 'owner' where user_id = $1`, [ids.frank]),
    )
    expect(r.affectedRows).toBe(0)
  })

  it('on ne peut changer ni le statut, ni la devise, ni le pays d\'une entreprise', async () => {
    const forbidden: Record<string, string> = { status: 'closed', default_currency: 'XAF', country_code: 'CI' }
    for (const [col, value] of Object.entries(forbidden)) {
      await expect(
        asUser(t.db, 'alice', () => q(`update public.companies set ${col} = '${value}' where id = $1`, [t.companyA])),
      ).rejects.toThrow(DENIED)
    }
  })

  it('un propriétaire peut modifier le nom de son entreprise', async () => {
    const r = await asUser(t.db, 'alice', () =>
      q(`update public.companies set trade_name = 'Nom commercial A' where id = $1`, [t.companyA]),
    )
    expect(r.affectedRows).toBe(1)
  })

  it('une entreprise ne peut pas perdre son dernier propriétaire', async () => {
    await expect(
      q(`update public.company_memberships set role_code = 'company_admin' where user_id = $1`, [ids.alice]),
    ).rejects.toThrow(/au moins un propriétaire/)
  })
})

describe('Révocation et désactivation : effet immédiat', () => {
  it('un membre révoqué perd l\'accès à l\'entreprise', async () => {
    const before = await asUser(t.db, 'dave', () => q('select * from public.companies'))
    expect(before.rows).toHaveLength(1)
    await asUser(t.db, 'alice', () =>
      q(`update public.company_memberships set status = 'revoked', revoked_at = now() where user_id = $1`, [ids.dave]),
    )
    const after = await asUser(t.db, 'dave', () => q('select * from public.companies'))
    expect(after.rows).toHaveLength(0)
  })

  it('un compte désactivé perd l\'accès, et ne peut plus créer d\'entreprise', async () => {
    await q(`update public.users set status = 'disabled' where id = $1`, [ids.carol])
    const r = await asUser(t.db, 'carol', () => q('select * from public.companies'))
    expect(r.rows).toHaveLength(0)
    await expect(asUser(t.db, 'carol', () => q(`select public.create_company('Nouvelle')`))).rejects.toThrow(/inactif/)
  })
})

describe('ACC-06 — journal d\'audit', () => {
  it('la création d\'une entreprise et du propriétaire est tracée avec l\'acteur', async () => {
    const r = await q<{ action: string; actor_user_id: string }>(
      `select action, actor_user_id from public.audit_events where company_id = $1 order by created_at, action`,
      [t.companyA],
    )
    const actions = r.rows.map((x) => x.action)
    expect(actions).toContain('company.created')
    expect(actions).toContain('membership.created')
    expect(r.rows.every((x) => x.actor_user_id === ids.alice)).toBe(true)
  })

  it('un changement de droit produit un événement (acteur, ancien et nouveau rôle)', async () => {
    await asUser(t.db, 'alice', () =>
      q(`update public.company_memberships set role_code = 'sales_purchasing' where user_id = $1`, [ids.erin]),
    )
    const r = await q<{ actor_user_id: string; metadata: { from: string; to: string } }>(
      `select actor_user_id, metadata from public.audit_events
       where company_id = $1 and action = 'membership.role_changed'`,
      [t.companyA],
    )
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].actor_user_id).toBe(ids.alice)
    expect(r.rows[0].metadata).toMatchObject({ from: 'auditor', to: 'sales_purchasing' })
  })

  it('une révocation est tracée', async () => {
    const r = await q(
      `select 1 from public.audit_events where company_id = $1 and action = 'membership.status_changed'`,
      [t.companyA],
    )
    expect(r.rows.length).toBeGreaterThan(0)
  })

  it('le journal est en ajout seul : modification, suppression et vidage refusés', async () => {
    await expect(q(`update public.audit_events set action = 'x'`)).rejects.toThrow(/ajout seul/)
    await expect(q(`delete from public.audit_events`)).rejects.toThrow(/ajout seul/)
    await expect(q(`truncate public.audit_events`)).rejects.toThrow(/ajout seul/)
  })

  it('aucun utilisateur ne peut écrire dans le journal ni appeler la fonction de journalisation', async () => {
    await expect(
      asUser(t.db, 'alice', () =>
        q(`insert into public.audit_events (company_id, action, entity_type) values ($1, 'faux', 'x')`, [t.companyA]),
      ),
    ).rejects.toThrow(DENIED)
    await expect(
      asUser(t.db, 'alice', () => q(`select app.log_event($1, 'faux', 'x', null, '{}')`, [t.companyA])),
    ).rejects.toThrow(DENIED)
  })
})
