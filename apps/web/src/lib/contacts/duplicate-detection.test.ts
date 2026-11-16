import { describe, expect, it } from "vitest";
import { DEFAULT_DUPLICATE_CRITERIA, duplicateKey, findDuplicateGroups, type DuplicateCandidate } from "./duplicate-detection";

const c = (id: string, name: string, extra: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
  id, name, email: null, phone: null, tax_identifier: null, ...extra,
});

describe("duplicate detection (FR-CRM-04)", () => {
  it("rapproche deux noms identiques à la casse, aux accents et à la ponctuation près", () => {
    const groups = findDuplicateGroups([c("1", "Société Étoile S.A.R.L."), c("2", "societe etoile sarl"), c("3", "Autre")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id)).toEqual(["1", "2"]);
    expect(groups[0].reasons).toEqual(["name"]);
  });

  it("rapproche par e-mail, identifiant fiscal et téléphone, avec leurs raisons", () => {
    const groups = findDuplicateGroups([
      c("1", "Alpha", { email: "Contact@Alpha.bf", phone: "+226 70 00 00 01", tax_identifier: "IFU 0012345A" }),
      c("2", "Beta", { email: "contact@alpha.bf" }),
      c("3", "Gamma", { phone: "22670000001" }),
      c("4", "Delta", { tax_identifier: "ifu0012345a" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id).sort()).toEqual(["1", "2", "3", "4"]);
    expect(groups[0].reasons).toEqual(["email", "taxIdentifier", "phone"]);
  });

  it("ignore les valeurs vides ou trop courtes", () => {
    const groups = findDuplicateGroups([
      c("1", "A", { email: "x", phone: "123", tax_identifier: "ab" }),
      c("2", "B", { email: "x", phone: "123", tax_identifier: "ab" }),
      c("3", "", { email: null }),
      c("4", "", { email: null }),
    ]);
    expect(groups).toEqual([]);
  });

  it("n'utilise pas un critère désactivé", () => {
    const rows = [c("1", "Alpha", { email: "a@b.bf" }), c("2", "Beta", { email: "a@b.bf" })];
    expect(findDuplicateGroups(rows, { ...DEFAULT_DUPLICATE_CRITERIA, email: false })).toEqual([]);
    expect(findDuplicateGroups(rows)).toHaveLength(1);
  });

  it("ne modifie pas les fiches fournies et ne fusionne jamais", () => {
    const rows = [c("1", "Alpha"), c("2", "ALPHA")];
    const copy = JSON.stringify(rows);
    const groups = findDuplicateGroups(rows);
    expect(JSON.stringify(rows)).toBe(copy);
    expect(groups[0].members).toHaveLength(2);
  });

  it("expose une clé de rapprochement normalisée", () => {
    expect(duplicateKey(c("1", "Éta-Plus"), "name")).toBe("etaplus");
    expect(duplicateKey(c("1", "x", { phone: "+226 70" }), "phone")).toBeNull();
  });
});
