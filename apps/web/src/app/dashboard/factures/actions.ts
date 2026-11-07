"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseInvoiceAbandonForm,
  parseInvoiceDraftForm,
  parseInvoiceFromQuoteForm,
} from "@/lib/security/invoice-draft-validation";
import type { InvoiceActionState } from "./types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invoiceUrl(invoiceId: string, companyId: string, flag: string): string {
  return "/dashboard/factures/" + invoiceId + "?company=" + encodeURIComponent(companyId) + "&" + flag;
}

function errorFlag(code: string | undefined): string {
  if (code === "42501") return "permission";
  if (code === "22023") return "invalid";
  return "failed";
}

export async function saveInvoiceDraft(
  _previousState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const parsed = parseInvoiceDraftForm(formData);
  if (!parsed.ok) return { error: parsed.reason };

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { error: "session" };

  const { data: invoiceId, error } = await supabase.rpc("save_invoice_draft", {
    p_company_id: parsed.data.companyId,
    p_customer_id: parsed.data.customerId,
    p_lines: parsed.data.lines,
    p_issue_date: parsed.data.issueDate,
    p_due_date: parsed.data.dueDate,
    p_invoice_id: parsed.data.invoiceId,
    p_subject: parsed.data.subject,
    p_terms: parsed.data.terms,
    p_notes: parsed.data.notes,
  });

  if (error || typeof invoiceId !== "string") {
    if (error) console.error("Invoice draft save failed:", { code: error.code });
    if (error?.code === "42501") return { error: "permission" };
    if (error?.code === "22023") return { error: "invalidData" };
    return { error: "save" };
  }

  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/factures/" + invoiceId);
  redirect(invoiceUrl(invoiceId, parsed.data.companyId, "success=saved"));
}

export async function createInvoiceDraftFromQuote(formData: FormData) {
  const parsed = parseInvoiceFromQuoteForm(formData);
  if (!parsed.ok) redirect("/dashboard/devis");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const quoteUrl = (flag: string) =>
    "/dashboard/devis/" + parsed.quoteId + "?company=" + encodeURIComponent(parsed.companyId) + "&" + flag;

  const { data: invoiceId, error } = await supabase.rpc("create_invoice_draft_from_quote", {
    p_quote_id: parsed.quoteId,
  });

  if (error || typeof invoiceId !== "string" || !UUID.test(invoiceId)) {
    if (error) console.error("Invoice from quote failed:", { code: error.code });
    redirect(quoteUrl("invoice_error=" + errorFlag(error?.code)));
  }

  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/devis/" + parsed.quoteId);
  redirect(invoiceUrl(invoiceId, parsed.companyId, "success=fromQuote"));
}

export async function abandonInvoiceDraft(formData: FormData) {
  const parsed = parseInvoiceAbandonForm(formData);
  if (!parsed.ok) {
    const invoice = formData.get("invoice_id");
    const company = formData.get("company_id");
    if (typeof invoice === "string" && typeof company === "string" && UUID.test(invoice) && UUID.test(company)) {
      redirect(invoiceUrl(invoice, company, "action_error=reason"));
    }
    redirect("/dashboard/factures");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { error } = await supabase.rpc("abandon_invoice_draft", {
    p_invoice_id: parsed.invoiceId,
    p_reason: parsed.reason,
  });

  if (error) {
    console.error("Invoice abandon failed:", { code: error.code });
    redirect(invoiceUrl(parsed.invoiceId, parsed.companyId, "action_error=" + errorFlag(error.code)));
  }

  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/factures/" + parsed.invoiceId);
  redirect(invoiceUrl(parsed.invoiceId, parsed.companyId, "success=abandoned"));
}
