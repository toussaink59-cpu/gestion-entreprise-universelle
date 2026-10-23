import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

// Garde-fou : les en-têtes de sécurité ne doivent pas disparaître lors d'un futur changement
// de configuration (SEC-03).
async function headersFor(path: string) {
  const rules = await nextConfig.headers!();
  const rule = rules.find((r) => r.source === path);
  expect(rule, `règle d'en-têtes pour ${path}`).toBeDefined();
  return Object.fromEntries(rule!.headers.map((h) => [h.key, h.value]));
}

describe("En-têtes de sécurité HTTP", () => {
  it("s'appliquent à toutes les routes", async () => {
    const h = await headersFor("/:path*");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toMatch(/^max-age=\d{7,}/);
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });

  it("interdisent l'encadrement de l'application et limitent formulaires et objets (CSP)", async () => {
    const csp = (await headersFor("/:path*"))["Content-Security-Policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("ne divulguent pas la technologie utilisée", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
