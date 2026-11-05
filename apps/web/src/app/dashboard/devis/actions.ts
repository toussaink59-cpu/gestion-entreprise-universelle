"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseQuoteDraftForm } from "@/lib/security/quote-draft-validation";
import type { QuoteActionState } from "./types";

export async function saveQuoteDraft(
  _previousState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const parsed = parseQuoteDraftForm(formData);

  if (!parsed.ok) {
    if (parsed.reason === "context") {
      return {
        error: "Le contexte de l’entreprise ou du client est invalide. Recharge la page.",
      };
    }
    if (parsed.reason === "lines") {
      return {
        error: "Vérifie les lignes : description, unité, quantité, prix et remise sont obligatoires et doivent être valides.",
      };
    }
    return {
      error: "Vérifie les dates et la longueur des champs texte avant d’enregistrer.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Ta session a expiré. Reconnecte-toi avant de poursuivre.",
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
      error: "Cette entreprise n’est pas accessible avec ton compte.",
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
        error: "Ce brouillon n’est pas accessible ou ton rôle ne permet pas cette opération.",
      };
    }

    if (saveError?.code === "22023") {
      return {
        error: "Les informations du devis sont incohérentes. Vérifie les dates, les remises et les lignes.",
      };
    }

    return {
      error: "Impossible d’enregistrer le brouillon. Vérifie les informations et réessaie.",
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
