
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCompanyName,
  readStringField,
} from "@/lib/security/form-validation";

type ReturnPath =
  | "/onboarding"
  | "/dashboard/entreprises/nouvelle";

const MIN_COMPANY_NAME_LENGTH = 2;
const MAX_COMPANY_NAME_LENGTH = 200;

function hasValidCompanyNameLength(value: string): boolean {
  const length = Array.from(value).length;

  return (
    length >= MIN_COMPANY_NAME_LENGTH &&
    length <= MAX_COMPANY_NAME_LENGTH
  );
}

async function handleCompanyCreation(
  formData: FormData,
  returnPath: ReturnPath,
) {
  // Récupérer et nettoyer la raison sociale.
  const legalNameField = readStringField(formData, "legal_name");
  const legalName = (legalNameField ?? "").trim();

  if (!legalName) {
    redirect(`${returnPath}?error=missing-name`);
  }

  // Vérifier la présence et la validité du nom commercial.
  const tradeNameField = readStringField(formData, "trade_name");

  if (tradeNameField === null && formData.has("trade_name")) {
    redirect(`${returnPath}?error=invalid-trade-name`);
  }

  const tradeName = (tradeNameField ?? "").trim();

  // Raison sociale : 2 à 200 caractères.
  if (
    !hasValidCompanyNameLength(legalName) ||
    !isValidCompanyName(legalName)
  ) {
    redirect(`${returnPath}?error=invalid-name`);
  }

  // Nom commercial facultatif : s'il est renseigné,
  // il doit également respecter la limite de 2 à 200 caractères.
  if (
    tradeName &&
    (
      !hasValidCompanyNameLength(tradeName) ||
      !isValidCompanyName(tradeName)
    )
  ) {
    redirect(`${returnPath}?error=invalid-trade-name`);
  }

  // Vérifier l'authentification.
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Créer l'entreprise via la fonction SQL sécurisée.
  const { error } = await supabase.rpc("create_company", {
    p_legal_name: legalName,
    p_trade_name: tradeName || null,
    p_country_code: "BF",
    p_currency: "XOF",
    p_timezone: "Africa/Ouagadougou",
  });

  if (error) {
    console.error("create_company failed:", error.code);

    if (error.code === "54000") {
      redirect(`${returnPath}?error=limit-reached`);
    }

    if (error.code === "22023") {
      redirect(`${returnPath}?error=invalid-company-data`);
    }

    redirect(`${returnPath}?error=creation-failed`);
  }

  redirect("/dashboard");
}

export async function createCompany(formData: FormData) {
  await handleCompanyCreation(formData, "/onboarding");
}

export async function createAdditionalCompany(formData: FormData) {
  await handleCompanyCreation(
    formData,
    "/dashboard/entreprises/nouvelle",
  );
}
