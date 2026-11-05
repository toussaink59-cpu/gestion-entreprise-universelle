"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseExpenseDraftForm } from "@/lib/security/expense-draft-validation";

export type ExpenseErrorKey =
  | "errors.context"
  | "errors.amount"
  | "errors.fields"
  | "errors.session"
  | "errors.access"
  | "errors.permission"
  | "errors.invalidData"
  | "errors.save";

export type ExpenseActionState = {
  error: ExpenseErrorKey | null;
};

export async function saveExpenseDraft(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = parseExpenseDraftForm(formData);

  if (!parsed.ok) {
    if (parsed.reason === "context") {
      return {
        error: "errors.context",
      };
    }
    if (parsed.reason === "amount") {
      return {
        error: "errors.amount",
      };
    }
    return {
      error: "errors.fields",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "errors.session",
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
      error: "errors.access",
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
        error: "errors.permission",
      };
    }

    if (saveError?.code === "22023") {
      return {
        error: "errors.invalidData",
      };
    }

    return {
      error: "errors.save",
    };
  }

  revalidatePath("/dashboard/depenses");
  redirect(
    "/dashboard/depenses?company=" +
      encodeURIComponent(parsed.data.companyId) +
      "&success=saved",
  );
}
