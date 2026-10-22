"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCompanyName,
  readStringField,
} from "@/lib/security/form-validation";

export async function createCompany(formData: FormData) {
  const legalNameField = readStringField(formData, "legal_name");
  const tradeNameField = readStringField(formData, "trade_name");

  if (legalNameField === null || !legalNameField.trim()) {
    redirect("/onboarding?error=missing-name");
  }

  if (tradeNameField === null && formData.has("trade_name")) {
    redirect("/onboarding?error=invalid-trade-name");
  }

  const legalName = legalNameField.trim();
  const tradeName = (tradeNameField ?? "").trim();

  if (!isValidCompanyName(legalName)) {
    redirect("/onboarding?error=invalid-name");
  }

  if (tradeName && !isValidCompanyName(tradeName)) {
    redirect("/onboarding?error=invalid-trade-name");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_company", {
    p_legal_name: legalName,
    p_trade_name: tradeName || legalName,
    p_country_code: "BF",
    p_currency: "XOF",
    p_timezone: "Africa/Ouagadougou",
  });

  if (error) {
    console.error("create_company failed:", error.code);
    redirect("/onboarding?error=creation-failed");
  }

  redirect("/dashboard");
}