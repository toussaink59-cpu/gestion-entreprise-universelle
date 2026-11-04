import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedDb,
  ids,
  seed,
  type TestDb,
} from "./helpers";

const DENIED = /row-level security|permission denied|violates/i;

let t: TestDb;
let customerId: string;

const q = <R extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => t.db.query<R>(sql, params);

beforeAll(async () => {
  t = await seed(await createMigratedDb());
  const customer = await asUser(t.db, "alice", () =>
    q<{ id: string }>(
      `insert into public.customers (company_id, name)
       values ($1, $2)
       returning id`,
      [t.companyA, "Document client A"],
    ),
  );
  customerId = customer.rows[0].id;
});

afterAll(async () => {
  await t.db.close();
});

async function createPendingDocument(companyId = t.companyA): Promise<string> {
  const id = randomUUID();
  const path = `${companyId}/${id}`;

  await asServiceRole(t.db, async () => {
    await q(
      `insert into public.documents (
         id, company_id, module_code, entity_type, entity_id, storage_path,
         original_name, mime_type, byte_size, sha256, scan_status, created_by
       )
       values ($1, $2, 'customers', 'customer', $3, $4,
               'facture-test.pdf', 'application/pdf', 128, repeat('a', 64),
               'pending_upload', $5)`,
      [id, companyId, customerId, path, ids.alice],
    );
    await q(
      `insert into storage.objects (bucket_id, name, metadata)
       values ('company-private-documents', $1, $2::jsonb)`,
      [path, JSON.stringify({ mimetype: "application/pdf", size: 128 })],
    );
    await q("select public.complete_document_upload($1)", [id]);
  });

  return id;
}

describe("Stockage privé des documents — configuration", () => {
  it("configure un bucket privé avec une limite de 20 MiB et quatre types MIME", async () => {
    const result = await q<{
      public: boolean;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>(
      `select public, file_size_limit::text, allowed_mime_types
       from storage.buckets
       where id = 'company-private-documents'`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].public).toBe(false);
    expect(result.rows[0].file_size_limit).toBe("20971520");
    expect(result.rows[0].allowed_mime_types.sort()).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("le bucket reste privé et la lecture des objets est soumise à une policy", async () => {
    const policies = await q<{ policyname: string; cmd: string }>(
      `select policyname, cmd
       from pg_policies
       where schemaname = 'storage'
         and tablename = 'objects'`,
    );
    expect(policies.rows).toContainEqual(
      expect.objectContaining({
        policyname: "company_private_documents_read",
        cmd: "SELECT",
      }),
    );
  });
});

describe("Stockage privé des documents — autorisation métier", () => {
  it("autorise un propriétaire à joindre un document à un client de son entreprise", async () => {
    const result = await asUser(t.db, "alice", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'customers', 'customer', $2) as allowed",
        [t.companyA, customerId],
      ),
    );
    expect(result.rows[0].allowed).toBe(true);
  });

  it("refuse une entreprise étrangère et un identifiant parent inexistant", async () => {
    const foreign = await asUser(t.db, "bob", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'customers', 'customer', $2) as allowed",
        [t.companyA, customerId],
      ),
    );
    const missing = await asUser(t.db, "alice", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'customers', 'customer', $2) as allowed",
        [t.companyA, randomUUID()],
      ),
    );
    expect(foreign.rows[0].allowed).toBe(false);
    expect(missing.rows[0].allowed).toBe(false);
  });

  it("refuse la création aux rôles en lecture seule ou sans accès au module", async () => {
    const finance = await asUser(t.db, "carol", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'customers', 'customer', $2) as allowed",
        [t.companyA, customerId],
      ),
    );
    const employee = await asUser(t.db, "dave", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'customers', 'customer', $2) as allowed",
        [t.companyA, customerId],
      ),
    );
    expect(finance.rows[0].allowed).toBe(false);
    expect(employee.rows[0].allowed).toBe(false);
  });

  it("vérifie l'entité et le module ensemble", async () => {
    const wrongModule = await asUser(t.db, "alice", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'suppliers', 'customer', $2) as allowed",
        [t.companyA, customerId],
      ),
    );
    const correctCompany = await asUser(t.db, "alice", () =>
      q<{ allowed: boolean }>(
        "select public.can_upload_document($1, 'company', 'company', $2) as allowed",
        [t.companyA, t.companyA],
      ),
    );
    expect(wrongModule.rows[0].allowed).toBe(false);
    expect(correctCompany.rows[0].allowed).toBe(true);
  });
});

describe("Stockage privé des documents — accès aux métadonnées et objets", () => {
  it("interdit aux utilisateurs de créer directement des métadonnées ou des objets", async () => {
    await expect(
      asUser(t.db, "alice", () =>
        q(
          `insert into public.documents (
             company_id, module_code, entity_type, entity_id, storage_path,
             original_name, mime_type, byte_size, sha256, created_by
           )
           values ($1, 'customers', 'customer', $2, $3,
                   'direct.pdf', 'application/pdf', 1, repeat('b', 64), $4)`,
          [t.companyA, customerId, `${t.companyA}/${randomUUID()}`, "00000000-0000-4000-8000-000000000001"],
        ),
      ),
    ).rejects.toThrow(DENIED);

    await expect(
      asUser(t.db, "alice", () =>
        q(
          `insert into storage.objects (bucket_id, name)
           values ('company-private-documents', $1)`,
          [`${t.companyA}/${randomUUID()}`],
        ),
      ),
    ).rejects.toThrow(DENIED);
  });

  it("un document en attente d'analyse ne peut pas être lu depuis Storage", async () => {
    const id = await createPendingDocument();
    const row = await q<{ scan_status: string }>(
      "select scan_status from public.documents where id = $1",
      [id],
    );
    expect(row.rows[0].scan_status).toBe("pending_scan");

    const object = await asUser(t.db, "alice", () =>
      q(
        "select * from storage.objects where bucket_id = 'company-private-documents' and name = $1",
        [`${t.companyA}/${id}`],
      ),
    );
    expect(object.rows).toHaveLength(0);
  });

  it("seul le service_role peut publier le résultat d'analyse", async () => {
    const id = await createPendingDocument();
    await expect(
      asUser(t.db, "alice", () =>
        q("select public.complete_document_scan($1, true, 'test-scanner')", [id]),
      ),
    ).rejects.toThrow(/permission denied/i);

    await asServiceRole(t.db, () =>
      q("select public.complete_document_scan($1, true, 'test-scanner')", [id]),
    );

    const doc = await asUser(t.db, "alice", () =>
      q<{ scan_status: string }>(
        "select scan_status from public.documents where id = $1",
        [id],
      ),
    );
    expect(doc.rows[0].scan_status).toBe("available");
  });

  it("un objet analysé reste lisible uniquement aux membres autorisés du module", async () => {
    const id = await createPendingDocument();
    await asServiceRole(t.db, () =>
      q("select public.complete_document_scan($1, true, 'test-scanner')", [id]),
    );

    const own = await asUser(t.db, "alice", () =>
      q(
        "select name from storage.objects where bucket_id = 'company-private-documents' and name = $1",
        [`${t.companyA}/${id}`],
      ),
    );
    const finance = await asUser(t.db, "carol", () =>
      q(
        "select name from storage.objects where bucket_id = 'company-private-documents' and name = $1",
        [`${t.companyA}/${id}`],
      ),
    );
    const foreign = await asUser(t.db, "bob", () =>
      q(
        "select name from storage.objects where bucket_id = 'company-private-documents' and name = $1",
        [`${t.companyA}/${id}`],
      ),
    );

    expect(own.rows).toHaveLength(1);
    expect(finance.rows).toHaveLength(1);
    expect(foreign.rows).toHaveLength(0);
  });

  it("un document rejeté reste inaccessible même à son propriétaire", async () => {
    const id = await createPendingDocument();
    await asServiceRole(t.db, () =>
      q("select public.complete_document_scan($1, false, 'test-scanner')", [id]),
    );

    const object = await asUser(t.db, "alice", () =>
      q(
        "select name from storage.objects where bucket_id = 'company-private-documents' and name = $1",
        [`${t.companyA}/${id}`],
      ),
    );
    const doc = await asUser(t.db, "alice", () =>
      q<{ scan_status: string }>(
        "select scan_status from public.documents where id = $1",
        [id],
      ),
    );
    expect(doc.rows[0].scan_status).toBe("rejected");
    expect(object.rows).toHaveLength(0);
  });

  it("les visiteurs anonymes ne peuvent ni consulter les métadonnées ni les objets", async () => {
    const id = await createPendingDocument();
    await expect(
      asAnon(t.db, () => q("select * from public.documents")),
    ).rejects.toThrow(DENIED);
    const objects = await asAnon(t.db, () =>
      q("select * from storage.objects where bucket_id = 'company-private-documents'"),
    );
    expect(objects.rows).toHaveLength(0);
  });
});
