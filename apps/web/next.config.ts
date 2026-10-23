import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les routes (SEC-03, audit du dépôt).
//
// La CSP ci-dessous se limite aux directives qui ne dépendent pas des scripts en ligne de Next.js.
// Une CSP stricte avec `script-src` et nonce suppose un rendu dynamique de toutes les pages
// (voir docs Next.js « Content Security Policy ») : elle fera l'objet d'un chantier dédié.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Ignoré en HTTP (développement local) ; actif dès que le site est servi en HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Content-Security-Policy",
    value:
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
