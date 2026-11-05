import { describe, expect, it } from "vitest";
import fr from "../messages/fr.json";
import en from "../messages/en.json";

function keyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keyShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, keyShape(child)]));
  }
  return typeof value;
}

function emptyLeaves(value: unknown, path = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) => emptyLeaves(child, path ? path + "." + key : key));
  }
  return typeof value === "string" && value.trim().length > 0 ? [] : [path];
}

describe("French and English message catalogs", () => {
  it("expose exactly the same message keys", () => {
    expect(keyShape(fr)).toEqual(keyShape(en));
  });
  it("do not contain empty or non-string message leaves", () => {
    expect(emptyLeaves(fr)).toEqual([]);
    expect(emptyLeaves(en)).toEqual([]);
  });
  it("provide dashboard navigation and home content in both locales", () => {
    expect(fr.Dashboard.Navigation.overview).toBe("Vue d’ensemble");
    expect(en.Dashboard.Navigation.overview).toBe("Overview");
    expect(fr.Dashboard.Home.noCompaniesTitle).toBe("Aucune entreprise accessible");
    expect(en.Dashboard.Home.noCompaniesTitle).toBe("No accessible company");
    expect(fr.Quotes.List.newQuote).toBe("Nouveau devis");
    expect(en.Quotes.List.newQuote).toBe("New quote");
    expect(fr.Quotes.Form.saveDraft).toBe("Enregistrer le brouillon");
    expect(en.Quotes.Form.saveDraft).toBe("Save draft");
    expect(fr.Quotes.Detail.sendButton).toBe("Transmettre et numéroter");
    expect(en.Quotes.Detail.sendButton).toBe("Send and number");
    expect(fr.Expenses.List.title).toBe("Dépenses");
    expect(en.Expenses.List.title).toBe("Expenses");
    expect(fr.Expenses.Form.draftOnly).toContain("Aucun paiement");
    expect(en.Expenses.Form.draftOnly).toContain("No payment");
  });
});
