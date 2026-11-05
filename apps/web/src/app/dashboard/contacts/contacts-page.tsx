import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createContact, setContactStatus, updateContact } from "@/app/dashboard/contacts/actions";
import { DocumentAttachments } from "./document-attachments";
import { createClient } from "@/lib/supabase/server";
import type { BusinessContactKind } from "@/lib/security/business-contact-validation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";

type PageSearchParams = Promise<{
  company?: string;
  q?: string;
  status?: string;
  error?: string;
  success?: string;
}>;

type ContactRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tax_identifier: string | null;
  address: string | null;
  city: string | null;
  country_code: string;
  payment_terms_days: number;
  notes: string | null;
  status: "active" | "archived";
  updated_at: string;
};

type CompanyRow = {
  id: string;
  legal_name: string;
  trade_name: string | null;
};

const INPUT_CLASS = "mt-1 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const BUTTON_CLASS = "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const SECONDARY_BUTTON_CLASS = "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-sm font-medium text-[var(--pg-text)] hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";

const READ_ROLES = new Set(["owner", "company_admin", "finance", "sales_purchasing", "auditor"]);
const WRITE_ROLES = new Set(["owner", "company_admin", "sales_purchasing"]);

function routeFor(kind: BusinessContactKind): string {
  return kind === "customer" ? "/dashboard/clients" : "/dashboard/fournisseurs";
}

type ContactFieldLabels = { name: string; contactName: string; email: string; phone: string; taxIdentifier: string; city: string; address: string; countryCode: string; paymentTerms: string; notes: string };

function ContactFields({ contact, labels }: { contact?: ContactRow; labels: ContactFieldLabels }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.name}
        <input className={INPUT_CLASS} name="name" required minLength={2} maxLength={200} defaultValue={contact?.name ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.contactName}
        <input className={INPUT_CLASS} name="contact_name" maxLength={150} defaultValue={contact?.contact_name ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.email}
        <input className={INPUT_CLASS} name="email" type="email" maxLength={254} defaultValue={contact?.email ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.phone}
        <input className={INPUT_CLASS} name="phone" type="tel" maxLength={40} defaultValue={contact?.phone ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.taxIdentifier}
        <input className={INPUT_CLASS} name="tax_identifier" maxLength={100} defaultValue={contact?.tax_identifier ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.city}
        <input className={INPUT_CLASS} name="city" maxLength={120} defaultValue={contact?.city ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)] sm:col-span-2">
        {labels.address}
        <input className={INPUT_CLASS} name="address" maxLength={250} defaultValue={contact?.address ?? ""} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.countryCode}
        <input className={INPUT_CLASS} name="country_code" required minLength={2} maxLength={2} defaultValue={contact?.country_code ?? "BF"} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)]">
        {labels.paymentTerms}
        <input className={INPUT_CLASS} name="payment_terms_days" type="number" min={0} max={365} step={1} defaultValue={contact?.payment_terms_days ?? 0} />
      </label>
      <label className="text-sm font-medium text-[var(--pg-text)] sm:col-span-2 lg:col-span-3">
        {labels.notes}
        <textarea className={INPUT_CLASS} name="notes" rows={3} maxLength={2000} defaultValue={contact?.notes ?? ""} />
      </label>
    </div>
  );
}

type CompanyChooserLabels = { title: string; description: string; open: string; back: string };

function CompanyChooser({ companies, kind, labels }: { companies: CompanyRow[]; kind: BusinessContactKind; labels: CompanyChooserLabels }) {
  return (
    <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[var(--pg-text)]">{labels.title}</h2>
      <p className="mt-1 text-sm text-[var(--pg-text-muted)]">{labels.description}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {companies.map((company) => (
          <a key={company.id} href={`${routeFor(kind)}?company=${encodeURIComponent(company.id)}`} className="rounded-md border border-[var(--pg-border)] p-4 hover:bg-[var(--pg-surface-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]">
            <span className="block font-semibold text-[var(--pg-text)]">{company.trade_name || company.legal_name}</span>
            <span className="mt-1 block text-sm text-[var(--pg-text-muted)]">{company.legal_name}</span>
            <span className="mt-3 inline-block text-sm font-medium text-[var(--pg-accent)]">{labels.open} →</span>
          </a>
        ))}
      </div>
      <p className="mt-5 text-sm"><a className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline" href="/dashboard">{labels.back}</a></p>
    </section>
  );
}

export async function ContactsPage({ kind, searchParams }: { kind: BusinessContactKind; searchParams: PageSearchParams }) {
  await connection();
  const t = await getTranslations("Contacts");
  const customer = kind === "customer";
  const pageTitle = customer ? t("titleCustomers") : t("titleSuppliers");
  const singularLabel = customer ? t("singularCustomer") : t("singularSupplier");
  const fieldLabels: ContactFieldLabels = {
    name: t("fields.name"), contactName: t("fields.contactName"), email: t("fields.email"), phone: t("fields.phone"),
    taxIdentifier: t("fields.taxIdentifier"), city: t("fields.city"), address: t("fields.address"), countryCode: t("fields.countryCode"),
    paymentTerms: t("fields.paymentTerms"), notes: t("fields.notes"),
  };
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id, role_code")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">{t("errors.access")}</p><p className="mt-4"><a href="/dashboard" className="text-[var(--pg-accent)] hover:underline">{t("backDashboard")}</a></p></main>;
  }

  const membershipRows = memberships ?? [];
  if (membershipRows.length === 0) redirect("/onboarding");

  const companyIds = [...new Set(membershipRows.map((membership) => membership.company_id))];
  const { data: companyData, error: companiesError } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .in("id", companyIds)
    .order("legal_name");

  if (companiesError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">{t("errors.companies")}</p></main>;
  }
  const companies = (companyData ?? []) as CompanyRow[];
  if (companies.length === 0) redirect("/onboarding");

  let selectedCompanyId: string | null = null;
  if (params.company) {
    selectedCompanyId = companyIds.includes(params.company) ? params.company : null;
  } else if (companies.length === 1) {
    selectedCompanyId = companies[0].id;
  }

  const baseRoute = routeFor(kind);
  const currentError = params.error === "access" ? t("errors.access")
    : params.error === "invalid" ? t("errors.invalid")
    : params.error === "save" ? t("errors.save")
    : params.error === "not-found" ? t("errors.notFound") : null;
  const currentSuccess = params.success === "created" ? t("success.created")
    : params.success === "updated" ? t("success.updated")
    : params.success === "archived" ? t("success.archived")
    : params.success === "restored" ? t("success.restored") : null;

  if (!selectedCompanyId) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={pageTitle}
          description={t("selectCompanyDescription")}
          actions={<a href="/dashboard" className={SECONDARY_BUTTON_CLASS}>{t("dashboard")}</a>}
        />
        {params.company && <p role="alert" className="mb-5 rounded-xl border border-[#E7CACA] bg-[#FAF0F0] p-4 text-[#963F3F]">{t("companyNotAccessible")}</p>}
        {currentError && <p role="alert" className="mb-5 rounded-xl border border-[#E7CACA] bg-[#FAF0F0] p-4 text-[#963F3F]">{currentError}</p>}
        {currentSuccess && <p role="status" className="mb-5 rounded-xl border border-[#D2E2D7] bg-[#EEF5F0] p-4 text-[#285C45]">{currentSuccess}</p>}
        <CompanyChooser companies={companies} kind={kind} labels={{ title: t("selectCompanyTitle"), description: t("directoriesPerCompany"), open: t("openDirectory"), back: t("backDashboard") }} />
      </main>
    );
  }

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const membership = membershipRows.find((row) => row.company_id === selectedCompanyId);
  if (!selectedCompany || !membership) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10"><p role="alert" className="rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">Cette entreprise n’est pas accessible avec ton compte.</p><p className="mt-4"><a href={baseRoute} className="text-[var(--pg-accent)] hover:underline">{t("chooseAnotherCompany")}</a></p></main>;
  }

  const roleCode = String(membership.role_code);
  const canRead = READ_ROLES.has(roleCode);
  const canWrite = WRITE_ROLES.has(roleCode);
  const statusFilter = params.status === "all" || params.status === "archived" ? params.status : "active";
  const queryText = (params.q ?? "").trim().slice(0, 80);
  let contacts: ContactRow[] = [];
  let contactsError: string | null = null;

  if (canRead) {
    let query = supabase
      .from(kind === "customer" ? "customers" : "suppliers")
      .select("id, name, contact_name, email, phone, tax_identifier, address, city, country_code, payment_terms_days, notes, status, updated_at")
      .eq("company_id", selectedCompanyId)
      .order("name", { ascending: true })
      .limit(100);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (queryText) query = query.ilike("name", `%${queryText}%`);

    const { data, error } = await query;
    if (error) {
      console.error("Business contact list failed:", { code: error.code });
      contactsError = t("errors.loadList");
    } else {
      contacts = (data ?? []) as ContactRow[];
    }
  }

  const otherRoute = kind === "customer" ? "/dashboard/fournisseurs" : "/dashboard/clients";
  const otherLabel = customer ? t("titleSuppliers") : t("titleCustomers");
  const companyQuery = `?company=${encodeURIComponent(selectedCompanyId)}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="PolyGest · Répertoires"
        title={pageTitle}
        description={t("description", { company: selectedCompany.trade_name || selectedCompany.legal_name })}
        actions={
          <nav aria-label={t("moduleNavigation")} className="flex flex-wrap gap-2">
            <a href="/dashboard" className={SECONDARY_BUTTON_CLASS}>{t("dashboard")}</a>
            <a href={`${otherRoute}${companyQuery}`} className={SECONDARY_BUTTON_CLASS}>{otherLabel}</a>
            {companies.length > 1 && <a href={baseRoute} className={SECONDARY_BUTTON_CLASS}>{t("changeCompany")}</a>}
          </nav>
        }
      />

      {currentError && <p role="alert" className="mb-5 rounded-xl border border-[#E7CACA] bg-[#FAF0F0] p-4 text-[#963F3F]">{currentError}</p>}
      {currentSuccess && <p role="status" className="mb-5 rounded-xl border border-[#D2E2D7] bg-[#EEF5F0] p-4 text-[#285C45]">{currentSuccess}</p>}

      {!canRead ? (
        <section className="rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] p-5 text-[var(--pg-text)]">
          <h2 className="font-semibold">{t("accessDeniedTitle")}</h2>
          <p className="mt-1 text-sm">{t("accessDeniedDescription", { kind: singularLabel })}</p>
        </section>
      ) : (
        <>
          {canWrite && (
            <section className="mb-8 border-b border-[var(--pg-border)] pb-6">
              <div className="mb-5"><h2 className="text-lg font-semibold text-[var(--pg-text)]">{customer ? t("addCustomer") : t("addSupplier")}</h2><p className="mt-1 text-sm text-[var(--pg-text-muted)]">{t("requiredFields")}</p></div>
              <form action={createContact} className="space-y-5">
                <input type="hidden" name="contact_kind" value={kind} />
                <input type="hidden" name="company_id" value={selectedCompanyId} />
                <ContactFields labels={fieldLabels} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pg-border)] pt-4">
                  <p className="text-xs text-[var(--pg-text-muted)]">{t("archiveInsteadOfDelete")}</p>
                  <button type="submit" className={BUTTON_CLASS}>{t("createRecord")}</button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)]">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--pg-border)] p-5 sm:p-6">
              <div><h2 className="text-lg font-semibold text-[var(--pg-text)]">{t("directory")}</h2><p className="mt-1 text-sm text-[var(--pg-text-muted)]">{t("directoryDescription")}</p></div>
              <form method="get" action={baseRoute} className="flex w-full flex-wrap gap-2 sm:w-auto">
                <input type="hidden" name="company" value={selectedCompanyId} />
                <label className="sr-only" htmlFor="contact-search">{t("searchName")}</label>
                <input id="contact-search" className="min-h-11 min-w-48 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]" type="search" name="q" maxLength={80} placeholder={t("searchPlaceholder")} defaultValue={queryText} />
                <label className="sr-only" htmlFor="contact-status">{t("status")}</label>
                <select id="contact-status" name="status" className="min-h-11 rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2 text-base text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]" defaultValue={statusFilter}>
                  <option value="active">{t("active")}</option><option value="archived">{t("archived")}</option><option value="all">{t("all")}</option>
                </select>
                <button className={SECONDARY_BUTTON_CLASS} type="submit">{t("filter")}</button>
              </form>
            </div>

            {contactsError ? (
              <p role="alert" className="m-5 rounded-md border border-[#E7CACA] bg-[#FAF0F0] p-4 text-sm text-[#963F3F]">{contactsError}</p>
            ) : contacts.length === 0 ? (
              <div className="p-5 sm:p-6"><EmptyState title={t("noRecordsTitle")} description={t("noRecordsDescription")} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--pg-surface-subtle)] text-xs font-medium text-[var(--pg-text-muted)]"><tr><th className="px-5 py-3 font-semibold">{t("columns.name")}</th><th className="px-5 py-3 font-semibold">{t("columns.contact")}</th><th className="px-5 py-3 font-semibold">{t("columns.details")}</th><th className="px-5 py-3 font-semibold">{t("columns.city")}</th><th className="px-5 py-3 font-semibold">{t("columns.status")}</th><th className="px-5 py-3 font-semibold">{t("columns.attachments")}</th><th className="px-5 py-3 font-semibold">{t("columns.actions")}</th></tr></thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-t border-[var(--pg-border)] align-top hover:bg-[var(--pg-surface-subtle)]">
                        <td className="px-5 py-4"><p className="font-semibold text-[var(--pg-text)]">{contact.name}</p>{contact.tax_identifier && <p className="mt-1 text-xs text-[var(--pg-text-muted)]">{t("taxIdentifier", { value: contact.tax_identifier })}</p>}</td>
                        <td className="px-5 py-4 text-[var(--pg-text)]">{contact.contact_name || <span className="text-[var(--pg-text-muted)]">—</span>}</td>
                        <td className="px-5 py-4"><div className="text-[var(--pg-text)]">{contact.email || "—"}</div><div className="mt-1 text-xs text-[var(--pg-text-muted)]">{contact.phone || "—"}</div></td>
                        <td className="px-5 py-4 text-[var(--pg-text)]">{contact.city || "—"}</td>
                        <td className="px-5 py-4"><span className={contact.status === "active" ? "rounded-md bg-[var(--pg-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--pg-text)]" : "rounded-md bg-[var(--pg-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--pg-text-muted)]"}>{contact.status === "active" ? t("recordActive") : t("recordArchived")}</span></td>
                        <td className="px-5 py-4"><DocumentAttachments companyId={selectedCompanyId} moduleCode={kind === "customer" ? "customers" : "suppliers"} entityType={kind} entityId={contact.id} canUpload={canWrite && process.env.DOCUMENT_SCANNER_ENABLED === "true"} scannerEnabled={process.env.DOCUMENT_SCANNER_ENABLED === "true"} /></td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-40 flex-col items-start gap-3">
                            {canWrite && <details className="w-full"><summary className="cursor-pointer font-medium text-[var(--pg-accent)] hover:underline">{t("edit")}</summary><form action={updateContact} className="mt-3 min-w-72 space-y-4 rounded-md border border-[var(--pg-border)] bg-[var(--pg-surface)] p-4">
                              <input type="hidden" name="contact_kind" value={kind} /><input type="hidden" name="company_id" value={selectedCompanyId} /><input type="hidden" name="contact_id" value={contact.id} />
                              <ContactFields contact={contact} labels={fieldLabels} /><button type="submit" className={BUTTON_CLASS}>{t("save")}</button>
                            </form></details>}
                            {canWrite && <form action={setContactStatus}>
                              <input type="hidden" name="contact_kind" value={kind} /><input type="hidden" name="company_id" value={selectedCompanyId} /><input type="hidden" name="contact_id" value={contact.id} />
                              <input type="hidden" name="status" value={contact.status === "active" ? "archived" : "active"} />
                              <button type="submit" className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--pg-text)] underline underline-offset-4 hover:text-[var(--pg-accent)]">{contact.status === "active" ? t("archive") : t("restore")}</button>
                            </form>}
                            {!canWrite && <span className="text-xs text-[var(--pg-text-muted)]">{t("readOnly")}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {contacts.length === 100 && <p className="border-t border-[var(--pg-border)] px-5 py-3 text-xs text-[var(--pg-text-muted)]">{t("maxRecords")}</p>}
          </section>
        </>
      )}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pg-border)] pt-5 text-sm text-[var(--pg-text-muted)]"><span>{t("footer")}</span><a href="/dashboard" className="font-medium text-[var(--pg-accent)] underline-offset-4 hover:underline">{t("backDashboard")}</a></footer>
    </main>
  );
}
