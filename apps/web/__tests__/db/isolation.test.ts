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
    ).rejects.toThrow(/row-level security|permission denied|violates|seul le propriétaire peut attribuer ce rôle/i)
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
    ).rejects.toThrow(/row-level security|permission denied|violates|seul le propriétaire peut attribuer ce rôle/i)
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

  it('un propriétaire ne peut pas se rétrograder et laisser l’entreprise sans propriétaire', async () => {
    const result = await asUser(t.db, 'alice', () =>
      q(
        `update public.company_memberships
         set role_code = 'company_admin'
         where user_id = $1`,
        [ids.alice],
      ),
    )

    expect(result.affectedRows).toBe(0)

    const check = await q<{ role_code: string }>(
      `select role_code
       from public.company_memberships
       where company_id = $1 and user_id = $2`,
      [t.companyA, ids.alice],
    )

    expect(check.rows[0].role_code).toBe('owner')
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

describe('Sécurité des appartenances — invitant et activation', () => {
  it('un administrateur ne peut pas créer directement une appartenance active', async () => {
    await expect(
      asUser(t.db, 'frank', () =>
        q(`
          insert into public.company_memberships
            (company_id, user_id, role_code, status)
          values ($1, $2, 'employee', 'active')
        `, [t.companyA, ids.mallory]),
      ),
    ).rejects.toThrow(/seul un propriétaire/);
  });
  it('un utilisateur ne peut pas falsifier invited_by', async () => {
    await expect(
      asUser(t.db, 'alice', () =>
        q(`
          insert into public.company_memberships
            (company_id, user_id, role_code, status, invited_by)
          values ($1, $2, 'employee', 'invited', $3)
        `, [t.companyA, ids.mallory, ids.bob]),
      ),
    ).rejects.toThrow(/permission denied|invited_by/i);
  });

  it('l invitant est défini par la session authentifiée', async () => {
    await asUser(t.db, 'alice', () =>
      q(`
        insert into public.company_memberships
          (company_id, user_id, role_code, status)
        values ($1, $2, 'employee', 'invited')
      `, [t.companyA, ids.mallory]),
    );

    const result = await q<{ invited_by: string; status: string }>(`
      select invited_by, status
      from public.company_memberships
      where company_id = $1 and user_id = $2
    `, [t.companyA, ids.mallory]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].invited_by).toBe(ids.alice);
    expect(result.rows[0].status).toBe('invited');
  });

  it('un administrateur ne peut pas activer une invitation', async () => {
    await expect(
      asUser(t.db, 'frank', () =>
        q(`
          update public.company_memberships
          set status = 'active'
          where company_id = $1 and user_id = $2
        `, [t.companyA, ids.mallory]),
      ),
    ).rejects.toThrow(/seul un propriétaire/);

    const result = await q<{ status: string }>(`
      select status
      from public.company_memberships
      where company_id = $1 and user_id = $2
    `, [t.companyA, ids.mallory]);

    expect(result.rows[0].status).toBe('invited');
  });

  it('le propriétaire peut activer une invitation existante', async () => {
    const result = await asUser(t.db, 'alice', () =>
      q(`
        update public.company_memberships
        set status = 'active'
        where company_id = $1 and user_id = $2
      `, [t.companyA, ids.mallory]),
    );

    expect(result.affectedRows).toBe(1);

    const membership = await q<{ status: string; invited_by: string }>(`
      select status, invited_by
      from public.company_memberships
      where company_id = $1 and user_id = $2
    `, [t.companyA, ids.mallory]);

    expect(membership.rows[0].status).toBe('active');
    expect(membership.rows[0].invited_by).toBe(ids.alice);
  });
  describe('Fonctions SQL de gestion des membres', () => {
    async function createTemporaryUser() {
      const idResult = await q<{ id: string }>(
        'select gen_random_uuid()::text as id',
      )
      const id = idResult.rows[0].id
      const email = `member-${id}@example.test`

      await q(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, $2, $3)`,
        [id, email, JSON.stringify({ full_name: 'Temporary member' })],
      )

      return { id, email }
    }

    it('le propriétaire peut consulter les membres de son entreprise', async () => {
      const result = await asUser(t.db, 'alice', () =>
        q<{ user_id: string; role_code: string; status: string }>(
          `select user_id, role_code, status
           from public.list_company_members($1)`,
          [t.companyA],
        ),
      )

      expect(result.rows).toContainEqual(
        expect.objectContaining({
          user_id: ids.alice,
          role_code: 'owner',
          status: 'active',
        }),
      )
      expect(result.rows.some((row) => row.user_id === ids.bob)).toBe(false)
    })

    it('un utilisateur sans permission ne peut pas lister les membres', async () => {
      await expect(
        asUser(t.db, 'mallory', () =>
          q('select * from public.list_company_members($1)', [t.companyA]),
        ),
      ).rejects.toThrow(/accès refusé/)
    })

    it('un administrateur peut inviter un compte existant', async () => {
      const target = await createTemporaryUser()

      try {
        const result = await asUser(t.db, 'frank', () =>
          q<{ membership_id: string }>(
            `select public.invite_existing_company_member($1, $2, $3)
               as membership_id`,
            [t.companyA, target.email, 'employee'],
          ),
        )

        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].membership_id).toBeTruthy()

        const membership = await q<{
          invited_by: string
          status: string
          role_code: string
        }>(
          `select invited_by, status, role_code
           from public.company_memberships
           where company_id = $1 and user_id = $2`,
          [t.companyA, target.id],
        )

        expect(membership.rows).toHaveLength(1)
        expect(membership.rows[0]).toMatchObject({
          invited_by: ids.frank,
          status: 'invited',
          role_code: 'employee',
        })
      } finally {
        await q('delete from auth.users where id = $1', [target.id])
      }
    })

    it('un administrateur ne peut pas attribuer le rôle propriétaire', async () => {
      const target = await createTemporaryUser()

      try {
        await expect(
          asUser(t.db, 'frank', () =>
            q(
              `select public.invite_existing_company_member($1, $2, $3)`,
              [t.companyA, target.email, 'owner'],
            ),
          ),
        ).rejects.toThrow(/seul le propriétaire/)
      } finally {
        await q('delete from auth.users where id = $1', [target.id])
      }
    })

    it('un administrateur ne peut pas attribuer le rôle company_admin', async () => {
      const target = await createTemporaryUser()

      try {
        await expect(
          asUser(t.db, 'frank', () =>
            q(
              `select public.invite_existing_company_member($1, $2, $3)`,
              [t.companyA, target.email, 'company_admin'],
            ),
          ),
        ).rejects.toThrow(/seul le propriétaire/)
      } finally {
        await q('delete from auth.users where id = $1', [target.id])
      }
    })

    it('un administrateur ne peut pas créer directement une invitation company_admin', async () => {
      const target = await createTemporaryUser()

      try {
        await expect(
          asUser(t.db, 'frank', () =>
            q(
              `insert into public.company_memberships
                 (company_id, user_id, role_code, status)
               values ($1, $2, 'company_admin', 'invited')`,
              [t.companyA, target.id],
            ),
          ),
        ).rejects.toThrow(/seul le propriétaire/)
      } finally {
        await q('delete from auth.users where id = $1', [target.id])
      }
    })

    it('un administrateur ne peut pas promouvoir un membre au rôle company_admin', async () => {
      const target = await createTemporaryUser()

      try {
        await asUser(t.db, 'alice', () =>
          q(
            `insert into public.company_memberships
               (company_id, user_id, role_code, status)
             values ($1, $2, 'employee', 'invited')`,
            [t.companyA, target.id],
          ),
        )

        try {
          const update = await asUser(t.db, 'frank', () =>
            q(
              `update public.company_memberships
               set role_code = 'company_admin'
               where company_id = $1 and user_id = $2`,
              [t.companyA, target.id],
            ),
          )
          expect(update.affectedRows).toBe(0)
        } catch (error) {
          expect(String(error)).toMatch(/seul le propriétaire|row-level security|permission denied/i)
        }

        const membership = await q<{ role_code: string }>(
          `select role_code from public.company_memberships
           where company_id = $1 and user_id = $2`,
          [t.companyA, target.id],
        )
        expect(membership.rows[0]?.role_code).toBe('employee')
      } finally {
        await q('delete from auth.users where id = $1', [target.id])
      }
    })
  })

  it('la suppression du compte invitant conserve l’invitation', async () => {
    await asUser(t.db, 'frank', () =>
      q(
        `insert into public.company_memberships
          (company_id, user_id, role_code, status)
         values ($1, $2, 'employee', 'invited')`,
        [t.companyA, ids.bob],
      ),
    )

    await q('delete from auth.users where id = $1', [ids.frank])

    const result = await q<{
      invited_by: string | null
      status: string
    }>(
      `select invited_by, status
       from public.company_memberships
       where company_id = $1 and user_id = $2`,
      [t.companyA, ids.bob],
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].status).toBe('invited')
    expect(result.rows[0].invited_by).toBeNull()
  })
});
