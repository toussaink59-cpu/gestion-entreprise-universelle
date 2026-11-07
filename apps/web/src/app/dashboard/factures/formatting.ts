import type { FormatLocale } from "../devis/formatting";

// Les formats monétaires, dates et quantités sont partagés avec les devis.
export {
  formatQuoteCurrency as formatInvoiceCurrency,
  formatQuoteDate as formatInvoiceDate,
  formatQuoteQuantity as formatInvoiceQuantity,
} from "../devis/formatting";

export function invoiceStatusLabel(status: string, locale: FormatLocale = "fr"): string {
  const labels =
    locale === "en"
      ? { draft: "Draft", abandoned_draft: "Abandoned draft" }
      : { draft: "Brouillon", abandoned_draft: "Brouillon abandonné" };
  return labels[status as keyof typeof labels] ?? (locale === "en" ? "Unknown status" : "Statut inconnu");
}
