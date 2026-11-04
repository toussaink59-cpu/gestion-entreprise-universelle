"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseExpenseDraftForm } from "@/lib/security/expense-draft-validation";

export type ExpenseActionState = {
  error: string | null;
};

export async function saveExpenseDraft(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = parseExpenseDraftForm(formData);

  if (!parsed.ok) {
    if (parsed.reason === "context") {
      return {
        error: "Le contexte de l’entreprise ou du fournisseur est invalide. Recharge la page.",
      };
    }
    if (parsed.reason === "amount") {
      return {
        error: "Saisis un montant strictement positif, avec au plus quatre décimales.",
      };
    }
    return {
      error: "Vérifie la date et les champs texte avant d’enregistrer.",
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

  const { data: savedExpenseId, error: saveError } = await supabase.rpc(
    "save_expense_draft",
    {
      p_company_id: parsed.data.companyId,
      p_expense_date: parsed.data.expenseDate,
      p_category: parsed.data.category,
      p_description: parsed.data.description,
      p_amount: parsed.data.amount,
      p_supplier_id: parsed.data.supplierId,
      p_notes: parsed.data.notes,
      p_expense_id: null,
    },
  );

  if (saveError || typeof savedExpenseId !== "string") {
    if (saveError) {
      console.error("Expense draft save failed:", { code: saveError.code });
    }

    if (saveError?.code === "42501") {
      return {
        error: "Cette entreprise n’est pas accessible ou ton rôle ne permet pas cette opération.",
      };
    }

    if (saveError?.code === "22023") {
      return {
        error: "Les informations de la dépense sont incohérentes. Vérifie le fournisseur, la date et le montant.",
      };
    }

    return {
      error: "Impossible d’enregistrer le brouillon. Vérifie les informations et réessaie.",
    };
  }

  revalidatePath("/dashboard/depenses");
  redirect(
    "/dashboard/depenses?company=" +
      encodeURIComponent(parsed.data.companyId) +
      "&success=saved",
  );
}
