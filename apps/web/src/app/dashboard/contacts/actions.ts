"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseBusinessContactForm,
  type BusinessContactKind,
} from "@/lib/security/business-contact-validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ContactTable = "customers" | "suppliers";
type QueryResult = { company?: string; error?: string; success?: string };

function tableFor(kind: BusinessContactKind): ContactTable {
  return kind === "customer" ? "customers" : "suppliers";
}

function routeFor(kind: BusinessContactKind): string {
  return kind === "customer" ? "/dashboard/clients" : "/dashboard/fournisseurs";
}

function returnTo(kind: BusinessContactKind, companyId: string, result: QueryResult): never {
  const params = new URLSearchParams({ company: companyId });
  if (result.error) params.set("error", result.error);
  if (result.success) params.set("success", result.success);
  redirect(`${routeFor(kind)}?${params.toString()}`);
}

function readText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

async function getAuthenticatedClientForCompany(
  kind: BusinessContactKind,
  companyId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  // Vérification de contexte supplémentaire côté serveur. La RLS et les
  // permissions SQL restent la protection définitive pour chaque écriture.
  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    returnTo(kind, companyId, { error: "access" });
  }

  return supabase;
}

export async function createContact(formData: FormData) {
  const parsed = parseBusinessContactForm(formData);
  if (!parsed.ok) {
    if (parsed.reason === "context") redirect("/dashboard");
    returnTo(parsed.kind, parsed.companyId, { error: "invalid" });
  }

  const supabase = await getAuthenticatedClientForCompany(
    parsed.kind,
    parsed.companyId,
  );
  const { error } = await supabase
    .from(tableFor(parsed.kind))
    .insert({ company_id: parsed.companyId, ...parsed.fields });

  if (error) {
    console.error("Business contact creation failed:", {
      code: error.code,
    });
    returnTo(parsed.kind, parsed.companyId, { error: "save" });
  }

  returnTo(parsed.kind, parsed.companyId, { success: "created" });
}

export async function updateContact(formData: FormData) {
  const parsed = parseBusinessContactForm(formData);
  if (!parsed.ok) {
    if (parsed.reason === "context") redirect("/dashboard");
    returnTo(parsed.kind, parsed.companyId, { error: "invalid" });
  }

  const contactId = readText(formData, "contact_id");
  if (!contactId || !UUID_PATTERN.test(contactId)) {
    returnTo(parsed.kind, parsed.companyId, { error: "invalid" });
  }

  const supabase = await getAuthenticatedClientForCompany(
    parsed.kind,
    parsed.companyId,
  );
  const { data, error } = await supabase
    .from(tableFor(parsed.kind))
    .update(parsed.fields)
    .eq("id", contactId)
    .eq("company_id", parsed.companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Business contact update failed:", {
      code: error.code,
    });
    returnTo(parsed.kind, parsed.companyId, { error: "save" });
  }
  if (!data) returnTo(parsed.kind, parsed.companyId, { error: "not-found" });

  returnTo(parsed.kind, parsed.companyId, { success: "updated" });
}

export async function setContactStatus(formData: FormData) {
  const rawKind = readText(formData, "contact_kind");
  const kind: BusinessContactKind | null =
    rawKind === "customer" || rawKind === "supplier" ? rawKind : null;
  const companyId = readText(formData, "company_id");
  const contactId = readText(formData, "contact_id");
  const status = readText(formData, "status");

  if (
    !kind ||
    !companyId ||
    !UUID_PATTERN.test(companyId) ||
    !contactId ||
    !UUID_PATTERN.test(contactId) ||
    (status !== "active" && status !== "archived")
  ) {
    redirect("/dashboard");
  }

  const supabase = await getAuthenticatedClientForCompany(kind, companyId);
  const { data, error } = await supabase
    .from(tableFor(kind))
    .update({ status })
    .eq("id", contactId)
    .eq("company_id", companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Business contact status change failed:", {
      code: error.code,
    });
    returnTo(kind, companyId, { error: "save" });
  }
  if (!data) returnTo(kind, companyId, { error: "not-found" });

  returnTo(kind, companyId, {
    success: status === "archived" ? "archived" : "restored",
  });
}
