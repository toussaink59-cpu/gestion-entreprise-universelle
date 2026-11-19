import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getLocaleMock, getTranslationsMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getLocaleMock: vi.fn(),
  getTranslationsMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("next-intl/server", () => ({
  getLocale: getLocaleMock,
  getTranslations: getTranslationsMock,
}));

import { ContactInsights } from "./contact-insights";

type QuerySnapshot = {
  eq: Array<[string, unknown]>;
  in: Array<[string, readonly unknown[]]>;
};

const querySnapshots = new Map<string, QuerySnapshot>();

function makeQuery(table: string, rows: unknown[]) {
  const snapshot: QuerySnapshot = { eq: [], in: [] };
  querySnapshots.set(table, snapshot);

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      snapshot.eq.push([column, value]);
      return query;
    },
    in: (column: string, values: readonly unknown[]) => {
      snapshot.in.push([column, values]);
      return query;
    },
    order: () => query,
    limit: async () => ({ data: rows, error: null }),
  };

  return query;
}

describe("ContactInsights — historique client", () => {
  const companyId = "company-a";
  const customerId = "customer-a";

  beforeEach(() => {
    vi.clearAllMocks();
    querySnapshots.clear();

    const rowsByTable: Record<string, unknown[]> = {
      customers: [
        {
          id: customerId,
          company_id: companyId,
          name: "Client A",
          email: null,
          phone: null,
          tax_identifier: null,
        },
      ],
      quotes: [
        {
          id: "quote-a",
          customer_id: customerId,
          quote_number: "D-2026-0001",
          status: "accepted",
          issue_date: "2026-11-01",
          currency_code: "XOF",
          total_amount: "12000",
        },
      ],
      invoices: [
        {
          id: "invoice-a",
          customer_id: customerId,
          subject: "Maintenance annuelle",
          status: "draft",
          issue_date: "2026-11-02",
          currency_code: "XOF",
          total_amount: "23000",
        },
        {
          id: "invoice-b",
          customer_id: customerId,
          subject: null,
          status: "abandoned_draft",
          issue_date: "2026-10-28",
          currency_code: "XOF",
          total_amount: "5000",
        },
      ],
      expenses: [],
    };

    createClientMock.mockResolvedValue({
      from: (table: string) => makeQuery(table, rowsByTable[table] ?? []),
    });
    getLocaleMock.mockResolvedValue("fr");
    getTranslationsMock.mockResolvedValue((key: string, values?: { count?: number }) => {
      if (key === "insights.historyItemsCount") return `${values?.count} éléments`;
      const messages: Record<string, string> = {
        "insights.historyCustomersTitle": "Historique commercial des clients",
        "insights.historyCustomersDescription": "Devis et brouillons de facture associés.",
        "insights.invoiceWithoutSubject": "Facture brouillon sans objet",
        "insights.invoiceStatuses.draft": "Brouillon de facture",
        "insights.invoiceStatuses.abandonedDraft": "Brouillon de facture abandonné",
        "insights.quoteStatuses.accepted": "Accepté",
      };
      return messages[key] ?? key;
    });
  });

  it("affiche les factures brouillons liées au client et les compte avec les devis", async () => {
    const markup = renderToStaticMarkup(
      await ContactInsights({
        companyId,
        kind: "customer",
        contacts: [{ id: customerId, name: "Client A" }],
      }),
    );

    expect(markup).toContain("Maintenance annuelle");
    expect(markup).toContain("Brouillon de facture");
    expect(markup).toContain("Brouillon de facture abandonné");
    expect(markup).toContain("3 éléments");

    const invoiceQuery = querySnapshots.get("invoices");
    expect(invoiceQuery?.eq).toContainEqual(["company_id", companyId]);
    expect(invoiceQuery?.in).toContainEqual(["customer_id", [customerId]]);
    expect(invoiceQuery?.in).toContainEqual(["status", ["draft", "abandoned_draft"]]);
  });
});
