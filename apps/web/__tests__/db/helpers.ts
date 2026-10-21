import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))

// Identifiants fictifs (aucune donnée réelle)
export const ids = {
  alice: '00000000-0000-4000-8000-00000000000a', // propriétaire de A
  bob: '00000000-0000-4000-8000-00000000000b', // propriétaire de B
  carol: '00000000-0000-4000-8000-00000000000c', // finance dans A
  dave: '00000000-0000-4000-8000-00000000000d', // employé dans A
  erin: '00000000-0000-4000-8000-00000000000e', // auditrice dans A
  frank: '00000000-0000-4000-8000-00000000000f', // administrateur d'entreprise dans A
  mallory: '00000000-0000-4000-8000-000000000099', // sans entreprise
} as const

export type Who = keyof typeof ids

export interface TestDb {
  db: PGlite
  companyA: string
  companyB: string
}

/** Crée une base vierge : doublure auth Supabase + toutes les migrations, dans l'ordre. */
export async function createMigratedDb(): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(readFileSync(join(repoRoot, 'supabase/tests/auth_shim.sql'), 'utf8'))
  const dir = join(repoRoot, 'supabase/migrations')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const f of files) await db.exec(readFileSync(join(dir, f), 'utf8'))
  return db
}

/** Exécute `fn` en tant qu'utilisateur connecté (rôle `authenticated`, comme l'API Supabase). */
export async function asUser<T>(db: PGlite, who: Who | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who ? ids[who] : ''])
  await db.exec('set role authenticated')
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

/** Exécute `fn` comme visiteur non connecté (rôle `anon`). */
export async function asAnon<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.exec('set role anon')
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}

/**
 * Jeu de test : A (alice propriétaire, carol finance, dave employé, erin auditrice,
 * frank administrateur) et B (bob propriétaire). Mallory n'appartient à aucune entreprise.
 */
export async function seed(db: PGlite): Promise<TestDb> {
  for (const [name, id] of Object.entries(ids)) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id,
      `${name}@example.test`,
      JSON.stringify({ full_name: name }),
    ])
  }

  const companyA = await asUser(db, 'alice', async () => {
    const r = await db.query<{ create_company: string }>(`select public.create_company('Entreprise A')`)
    return r.rows[0].create_company
  })
  const companyB = await asUser(db, 'bob', async () => {
    const r = await db.query<{ create_company: string }>(`select public.create_company('Entreprise B')`)
    return r.rows[0].create_company
  })

  await asUser(db, 'alice', async () => {
    for (const [who, role] of [
      ['carol', 'finance'],
      ['dave', 'employee'],
      ['erin', 'auditor'],
      ['frank', 'company_admin'],
    ] as const) {
      await db.query(
        `insert into public.company_memberships (company_id, user_id, role_code) values ($1, $2, $3)`,
        [companyA, ids[who], role],
      )
    }
  })

  return { db, companyA, companyB }
}
