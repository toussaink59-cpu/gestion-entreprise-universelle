import { describe, expect, it } from "vitest";
import { invoiceStatusLabel } from "./formatting";

describe("invoiceStatusLabel", () => {
  it("libelle les deux statuts de brouillon dans les deux langues", () => {
    expect(invoiceStatusLabel("draft", "fr")).toBe("Brouillon");
    expect(invoiceStatusLabel("abandoned_draft", "fr")).toBe("Brouillon abandonné");
    expect(invoiceStatusLabel("draft", "en")).toBe("Draft");
    expect(invoiceStatusLabel("abandoned_draft", "en")).toBe("Abandoned draft");
  });

  it("n'invente jamais un statut inconnu", () => {
    expect(invoiceStatusLabel("issued", "fr")).toBe("Statut inconnu");
    expect(invoiceStatusLabel("issued", "en")).toBe("Unknown status");
  });
});
