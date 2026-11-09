import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asServiceRole, createMigratedDb, type SqlClient } from "./helpers";

let db: SqlClient;

const q = <R extends object = Record<string, unknown>>(sql: string) =>
  db.query<R>(sql);

beforeAll(async () => {
  db = await createMigratedDb();
});

afterAll(async () => {
  await db.close();
});

describe("Sécurité — privilèges service_role et factures", () => {
  it("refuse les accès directs aux factures tout en conservant les accès documentaires", async () => {
    const privileges = (
      await q<{
        invoices_select: boolean;
        invoices_insert: boolean;
        invoices_update: boolean;
        invoices_delete: boolean;
        invoices_truncate: boolean;
        lines_select: boolean;
        lines_insert: boolean;
        lines_update: boolean;
        lines_delete: boolean;
        lines_truncate: boolean;
        save_invoice_execute: boolean;
        create_from_quote_execute: boolean;
        abandon_invoice_execute: boolean;
        helper_execute: boolean;
        documents_select: boolean;
        documents_insert: boolean;
        documents_update: boolean;
        documents_delete: boolean;
        complete_upload_execute: boolean;
        complete_scan_execute: boolean;
      }>(`
        select
          has_table_privilege('service_role', 'public.invoices', 'SELECT') as invoices_select,
          has_table_privilege('service_role', 'public.invoices', 'INSERT') as invoices_insert,
          has_table_privilege('service_role', 'public.invoices', 'UPDATE') as invoices_update,
          has_table_privilege('service_role', 'public.invoices', 'DELETE') as invoices_delete,
          has_table_privilege('service_role', 'public.invoices', 'TRUNCATE') as invoices_truncate,

          has_table_privilege('service_role', 'public.invoice_lines', 'SELECT') as lines_select,
          has_table_privilege('service_role', 'public.invoice_lines', 'INSERT') as lines_insert,
          has_table_privilege('service_role', 'public.invoice_lines', 'UPDATE') as lines_update,
          has_table_privilege('service_role', 'public.invoice_lines', 'DELETE') as lines_delete,
          has_table_privilege('service_role', 'public.invoice_lines', 'TRUNCATE') as lines_truncate,

          has_function_privilege('service_role',
            'public.save_invoice_draft(uuid,uuid,jsonb,date,date,uuid,text,text,text)',
            'EXECUTE') as save_invoice_execute,
          has_function_privilege('service_role',
            'public.create_invoice_draft_from_quote(uuid,date,date)',
            'EXECUTE') as create_from_quote_execute,
          has_function_privilege('service_role',
            'public.abandon_invoice_draft(uuid,text)',
            'EXECUTE') as abandon_invoice_execute,
          has_function_privilege('service_role',
            'app.invoice_line_amounts(numeric,numeric,text,numeric,integer)',
            'EXECUTE') as helper_execute,

          has_table_privilege('service_role', 'public.documents', 'SELECT') as documents_select,
          has_table_privilege('service_role', 'public.documents', 'INSERT') as documents_insert,
          has_table_privilege('service_role', 'public.documents', 'UPDATE') as documents_update,
          has_table_privilege('service_role', 'public.documents', 'DELETE') as documents_delete,
          has_function_privilege('service_role',
            'public.complete_document_upload(uuid)',
            'EXECUTE') as complete_upload_execute,
          has_function_privilege('service_role',
            'public.complete_document_scan(uuid,boolean,text,bigint,text,text)',
            'EXECUTE') as complete_scan_execute
      `)
    ).rows[0];

    expect(privileges).toEqual({
      invoices_select: false,
      invoices_insert: false,
      invoices_update: false,
      invoices_delete: false,
      invoices_truncate: false,
      lines_select: false,
      lines_insert: false,
      lines_update: false,
      lines_delete: false,
      lines_truncate: false,
      save_invoice_execute: false,
      create_from_quote_execute: false,
      abandon_invoice_execute: false,
      helper_execute: false,
      documents_select: true,
      documents_insert: true,
      documents_update: true,
      documents_delete: true,
      complete_upload_execute: true,
      complete_scan_execute: true,
    });

    await expect(
      asServiceRole(db, () => q("select id from public.invoices"))
    ).rejects.toThrow();

    await expect(
      asServiceRole(db, () =>
        q("select public.save_invoice_draft(null, null, '[]'::jsonb, current_date)")
      )
    ).rejects.toThrow();
  });
});