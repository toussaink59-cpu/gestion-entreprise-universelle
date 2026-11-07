import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp("--" + name + ":\\s*(#[0-9a-fA-F]{6})\\s*;"));
  if (!match) throw new Error("Token manquant : " + name);
  return match[1];
}

function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts|css)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("Contrastes des tokens du design system (WCAG)", () => {
  const surfaces = ["pg-surface", "pg-canvas", "pg-surface-subtle"].map(token);

  it("garde le texte principal et secondaire lisibles (AA) sur toutes les surfaces", () => {
    for (const surface of surfaces) {
      expect(contrast(token("pg-text"), surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token("pg-text-muted"), surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("garde l'accent lisible comme texte et comme fond de bouton à texte blanc", () => {
    for (const surface of surfaces) expect(contrast(token("pg-accent"), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", token("pg-accent"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", token("pg-accent-hover"))).toBeGreaterThanOrEqual(4.5);
  });

  it("garde l'anneau de focus et les bordures de champs visibles (3:1)", () => {
    for (const surface of surfaces) expect(contrast(token("pg-focus"), surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(token("pg-control-border"), token("pg-surface"))).toBeGreaterThanOrEqual(3);
  });

  it("réserve l'orange de marque aux repères non textuels", () => {
    expect(contrast(token("pg-brand"), token("pg-surface"))).toBeLessThan(3);
    const offenders = sourceFiles(join(__dirname, "..")).filter((file) =>
      /(?:text|bg|border|ring|outline)-\[var\(--pg-brand\)\]/.test(readFileSync(file, "utf8")) &&
      /(?:text|bg)-\[var\(--pg-brand\)\]/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
