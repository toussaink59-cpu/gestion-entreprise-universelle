import { PGlite } from '@electric-sql/pglite'
import { Client } from 'pg'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))

// Identifiants fictifs (aucune donnée réelle). Ils sont UNIQUES à chaque fichier de test :
// plusieurs fichiers peuvent ainsi partager une même base réelle sans collision.
export const ids = {
  alice: randomUUID(), // propriétaire de A
  bob: randomUUID(), // propriétaire de B
  carol: randomUUID(), // finance dans A
  dave: randomUUID(), // employé dans A
  erin: randomUUID(), // auditrice dans A
  frank: randomUUID(), // administrateur d'entreprise dans A
  mallory: randomUUID(), // sans entreprise
} as const

export type Who = keyof typeof ids

/** Client SQL minimal commun à PGlite (par défaut) et à une vraie base PostgreSQL. */
export interface SqlClient {
  query<R extends object = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; affectedRows?: number }>
  exec(sql: string): Promise<unknown>
  close(): Promise<void>
}

export interface TestDb {
  db: SqlClient
  companyA: string
  companyB: string
}

function fromPglite(db: PGlite): SqlClient {
  return {
    query: async <R extends object>(sql: string, params?: unknown[]) => {
      const r = await db.query<R>(sql, params)
      return { rows: r.rows, affectedRows: r.affectedRows }
    },
    exec: (sql) => db.exec(sql),
    close: () => db.close(),
  }
}

async function fromRealDatabase(url: string): Promise<SqlClient> {
  const client = new Client({ connectionString: url })
  await client.connect()
  return {
    query: async <R extends object>(sql: string, params?: unknown[]) => {
      const r = await client.query(sql, params)
      return { rows: r.rows as R[], affectedRows: r.rowCount ?? 0 }
    },
    exec: async (sql) => {
      await client.query(sql)
    },
    close: () => client.end(),
  }
}

/**
 * Par défaut : base PGlite vierge (doublure auth Supabase + migrations, dans l'ordre).
 * Si TEST_DATABASE_URL est définie : se connecte à cette base RÉELLE, déjà migrée
 * (ex. `supabase start`). À utiliser uniquement sur une base jetable, jamais en production.
 */
export async function createMigratedDb(): Promise<SqlClient> {
  const url = process.env.TEST_DATABASE_URL
  if (url) return fromRealDatabase(url)

  const db = new PGlite()
  await db.exec(readFileSync(join(repoRoot, 'supabase/tests/auth_shim.sql'), 'utf8'))
  const dir = join(repoRoot, 'supabase/migrations')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const f of files) await db.exec(readFileSync(join(dir, f), 'utf8'))
  return fromPglite(db)
}

/** Exécute `fn` en tant qu'utilisateur connecté (rôle `authenticated`, comme l'API Supabase). */
export async function asUser<T>(db: SqlClient, who: Who | null, fn: () => Promise<T>): Promise<T> {
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
export async function asAnon<T>(db: SqlClient, fn: () => Promise<T>): Promise<T> {
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
export async function seed(db: SqlClient): Promise<TestDb> {
  for (const [name, id] of Object.entries(ids)) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id,
      `${name}-${id.slice(0, 8)}@example.test`,
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
