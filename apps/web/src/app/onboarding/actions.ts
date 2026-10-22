"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCompany(formData: FormData) {
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const tradeName = String(formData.get("trade_name") ?? "").trim();

  if (!legalName) {
    redirect("/onboarding?error=missing-name");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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