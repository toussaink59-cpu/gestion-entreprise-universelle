import { describe, expect, it } from "vitest";
import {
  isValidCompanyName,
  isValidEmail,
  isValidFullName,
  isValidNewPassword,
  normalizeEmail,
  readStringField,
} from "../../src/lib/security/form-validation";

describe("readStringField", () => {
  it("lit un champ texte", () => {
    const form = new FormData();
    form.set("email", "user@example.com");
    expect(readStringField(form, "email")).toBe("user@example.com");
  });

  it("retourne null si le champ est absent", () => {
    expect(readStringField(new FormData(), "email")).toBeNull();
  });

  it("refuse un fichier dans un champ texte", () => {
    const form = new FormData();
    form.append("email", new Blob(["payload"]), "file.txt");
    expect(readStringField(form, "email")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("retire les espaces et convertit l'adresse en minuscules", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("isValidEmail", () => {
  it.each([
    ["user@example.com", true],
    ["first.last+tag@example.co.bf", true],
    ["invalid-email", false],
    ["user name@example.com", false],
    ["user@localhost", false],
    [`${"a".repeat(250)}@example.com`, false],
  ])("valide %s", (email, expected) => {
    expect(isValidEmail(email)).toBe(expected);
  });
});

describe("isValidFullName", () => {
  it.each([
    ["A", false],
    ["Toussaint Kiemde", true],
    ["  Nom valide  ", true],
    ["N".repeat(101), false],
  ])("valide la longueur du nom", (name, expected) => {
    expect(isValidFullName(name)).toBe(expected);
  });
});

describe("isValidNewPassword", () => {
  it.each([
    ["1234567", false],
    ["12345678", true],
    ["P".repeat(128), true],
    ["P".repeat(129), false],
  ])("valide la longueur du mot de passe", (password, expected) => {
    expect(isValidNewPassword(password)).toBe(expected);
  });
});

describe("isValidCompanyName", () => {
  it.each([
    ["KVTECH", true],
    ["  ", false],
    ["A", false],
    ["C".repeat(200), true],
    ["C".repeat(201), false],
  ])("valide la raison sociale", (name, expected) => {
    expect(isValidCompanyName(name)).toBe(expected);
  });
});