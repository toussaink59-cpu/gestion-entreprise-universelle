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
  it("never expose server configuration variable names to the browser", () => {
    // Les catalogues sont envoyés intégralement à chaque visiteur.
    const leaves = (value: unknown): string[] =>
      value && typeof value === "object" ? Object.values(value).flatMap(leaves) : typeof value === "string" ? [value] : [];
    const envLike = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;
    expect(leaves(fr).filter((text) => envLike.test(text))).toEqual([]);
    expect(leaves(en).filter((text) => envLike.test(text))).toEqual([]);
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
  });
  it("provide member and company-management copy in both locales", () => {
    expect(fr.Members.roles.owner).toBe("Propriétaire");
    expect(en.Members.roles.owner).toBe("Owner");
    expect(fr.Members.errors.companies).toBeTruthy();
    expect(en.Members.errors.companies).toBeTruthy();
    expect(fr.Companies.submit).toBe("Créer l’entreprise");
    expect(en.Companies.submit).toBe("Create company");
  });
  it("provide invitation acceptance copy in both locales", () => {
    expect(fr.Invitations.Accept.confirmTitle).toBe("Confirmer ton invitation");
    expect(en.Invitations.Accept.confirmTitle).toBe("Confirm your invitation");
    expect(fr.Invitations.Accept.invalidTitle).toBeTruthy();
    expect(en.Invitations.Accept.invalidTitle).toBeTruthy();
  });
  it("provide expense management copy and errors in both locales", () => {
    expect(fr.Expenses.List.title).toBe("Dépenses");
    expect(en.Expenses.List.title).toBe("Expenses");
    expect(fr.Expenses.Form.errors.amount).toBeTruthy();
    expect(en.Expenses.Form.errors.amount).toBeTruthy();
    expect(fr.Expenses.Errors.readDenied).toBeTruthy();
    expect(en.Expenses.Errors.readDenied).toBeTruthy();
  });
});
