"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseQuoteDraftForm } from "@/lib/security/quote-draft-validation";
import {
  parseQuoteCancellationForm,
  parseQuoteResponseForm,
} from "@/lib/security/quote-response-validation";
import type { QuoteActionState } from "./types";

export async function saveQuoteDraft(
  _previousState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const parsed = parseQuoteDraftForm(formData);

  if (!parsed.ok) {
    if (parsed.reason === "context") {
      return {
        error: "context",
      };
    }
    if (parsed.reason === "lines") {
      return {
        error: "lines",
      };
    }
    return {
      error: "fields",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "session",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("company_id", parsed.data.companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      error: "company",
    };
  }

  const { data: savedQuoteId, error: saveError } = await supabase.rpc(
    "save_quote_draft",
    {
      p_company_id: parsed.data.companyId,
      p_customer_id: parsed.data.customerId,
      p_lines: parsed.data.lines,
      p_issue_date: parsed.data.issueDate,
      p_valid_until: parsed.data.validUntil,
      p_quote_id: parsed.data.quoteId,
      p_subject: parsed.data.subject,
      p_terms: parsed.data.terms,
      p_notes: parsed.data.notes,
    },
  );

  if (saveError || typeof savedQuoteId !== "string") {
    if (saveError) {
      console.error("Quote draft save failed:", { code: saveError.code });
    }

    if (saveError?.code === "42501") {
      return {
        error: "permission",
      };
    }

    if (saveError?.code === "22023") {
      return {
        error: "invalidData",
      };
    }

    return {
      error: "save",
    };
  }

  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard/devis/" + savedQuoteId);

  redirect(
    "/dashboard/devis/" +
      savedQuoteId +
      "?company=" +
      encodeURIComponent(parsed.data.companyId) +
      "&success=saved",
  );
}

const QUOTE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function quoteDetailUrl(quoteId: string, companyId: string, flag: string): string {
  return (
    "/dashboard/devis/" +
    quoteId +
    "?company=" +
    encodeURIComponent(companyId) +
    "&" +
    flag
  );
}

export async function sendQuote(formData: FormData) {
  const companyField = formData.get("company_id");
  const quoteField = formData.get("quote_id");

  if (
    typeof companyField !== "string" ||
    !QUOTE_UUID.test(companyField) ||
    typeof quoteField !== "string" ||
    !QUOTE_UUID.test(quoteField)
  ) {
    redirect("/dashboard/devis");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: number, error } = await supabase.rpc("send_quote", {
    p_company_id: companyField,
    p_quote_id: quoteField,
  });

  if (error || typeof number !== "string") {
    if (error) console.error("Quote send failed:", { code: error.code });
    const reason =
      error?.code === "42501"
        ? "permission"
        : error?.code === "55000"
          ? "not-draft"
          : error?.code === "22023"
            ? "invalid"
            : "failed";
    redirect(quoteDetailUrl(quoteField, companyField, "send_error=" + reason));
  }

  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard/devis/" + quoteField);
  redirect(quoteDetailUrl(quoteField, companyField, "success=sent"));
}

function actionErrorFlag(code: string | undefined): string {
  if (code === "42501") return "permission";
  if (code === "55000") return "state";
  if (code === "22023") return "invalid";
  return "failed";
}

export async function recordQuoteResponse(formData: FormData) {
  const parsed = parseQuoteResponseForm(formData);
  if (!parsed.ok) {
    if (parsed.reason === "context") redirect("/dashboard/devis");
    const raw = formData.get("quote_id");
    const company = formData.get("company_id");
    if (typeof raw === "string" && typeof company === "string" && QUOTE_UUID.test(raw) && QUOTE_UUID.test(company)) {
      redirect(quoteDetailUrl(raw, company, "action_error=invalid"));
    }
    redirect("/dashboard/devis");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { error } = await supabase.rpc("record_quote_response", {
    p_company_id: parsed.companyId,
    p_quote_id: parsed.quoteId,
    p_decision: parsed.decision,
    p_method: parsed.method,
    p_reference: parsed.reference,
  });

  if (error) {
    console.error("Quote response failed:", { code: error.code });
    redirect(quoteDetailUrl(parsed.quoteId, parsed.companyId, "action_error=" + actionErrorFlag(error.code)));
  }

  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard/devis/" + parsed.quoteId);
  redirect(quoteDetailUrl(parsed.quoteId, parsed.companyId, "success=" + parsed.decision));
}

export async function cancelQuote(formData: FormData) {
  const parsed = parseQuoteCancellationForm(formData);
  if (!parsed.ok) {
    if (parsed.reason === "context") redirect("/dashboard/devis");
    const raw = formData.get("quote_id");
    const company = formData.get("company_id");
    if (typeof raw === "string" && typeof company === "string" && QUOTE_UUID.test(raw) && QUOTE_UUID.test(company)) {
      redirect(quoteDetailUrl(raw, company, "action_error=reason"));
    }
    redirect("/dashboard/devis");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { error } = await supabase.rpc("cancel_quote", {
    p_company_id: parsed.companyId,
    p_quote_id: parsed.quoteId,
    p_reason: parsed.reason,
  });

  if (error) {
    console.error("Quote cancellation failed:", { code: error.code });
    redirect(quoteDetailUrl(parsed.quoteId, parsed.companyId, "action_error=" + actionErrorFlag(error.code)));
  }

  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard/devis/" + parsed.quoteId);
  redirect(quoteDetailUrl(parsed.quoteId, parsed.companyId, "success=cancelled"));
}
