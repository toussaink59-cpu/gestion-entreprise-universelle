---
name: chatgpt-5-4-frontend-skill
description: Use when designing or building PolyGest frontend pages, applications, dashboards, prototypes or UI. Apply visual composition, hierarchy, imagery and restrained motion while strictly preserving PolyGest design, functional, accessibility, privacy and security standards.
---

# ChatGPT 5.4 Frontend Skill — PolyGest adoption

This skill is adopted as the frontend design method for PolyGest. Its original visual principles are retained, with the mandatory PolyGest controls below taking precedence whenever there is a conflict.

## Workflow

Before implementation, write three short bullets in the task plan:
- visual thesis: mood, material and energy;
- content plan: working surface, supporting context and details;
- motion thesis: 2–3 meaningful interactions, or explicitly no motion when it adds no value.

Then inspect the existing route, components, tokens, server/client boundaries, permissions and tests. Preserve the existing design system and established patterns. Do not redesign unrelated screens.

## Design rules

- Start from the user's task and information hierarchy, not decorative components.
- For dashboards, start with the working surface (table, editor, queue, chart or form), never a marketing hero unless explicitly required.
- Prefer calm, dense-but-readable layouts and cardless composition. Use cards only when they represent a meaningful interaction or grouping.
- Use the existing PolyGest tokens, Geist typography and component conventions. Do not invent a new palette or typography system.
- Keep French business terminology consistent and support responsive desktop, tablet and mobile layouts.
- Use only the project's existing icon system; no emoji in product UI.
- Provide explicit loading, empty, error, success, disabled and unauthorized states.
- Make forms accessible, preserve safe user input after validation errors, and explain consequential financial actions before confirmation.
- Respect reduced motion and avoid decorative animation.

## Mandatory security and privacy rules

Read and follow `docs/FRONTEND_SECURITY_STANDARD.md` before changing frontend code. These rules are release-blocking:

1. **No server secret in browser code.** Never expose Supabase `service_role`, private API keys, database credentials, signing secrets, SMTP credentials, private tokens or any server-only environment variable to a Client Component, browser bundle, HTML, source map, public runtime config, URL, local/session storage, IndexedDB, console or client-visible API response.
2. Only explicitly public values may use `NEXT_PUBLIC_*`; public Supabase URL and publishable/anon key are not authorization. Never use them as a substitute for server-side checks or RLS.
3. Keep privileged Supabase clients and secret-bearing modules server-only. Add `import 'server-only'` to server-only modules where supported. Never import them from a Client Component or shared client module.
4. Do not rely on hidden buttons, route guards, client state, disabled controls or role labels for authorization. Enforce identity, active membership, role, permission, tenant ownership and input validation on the server and in PostgreSQL RLS.
5. Never trust client-supplied `company_id`, user ID, role, price, totals, tax, status, ownership or approval state. Resolve identity from the authenticated server session and recompute sensitive values on the server/database.
6. Use server actions/API handlers with authentication, authorization, schema validation, safe error handling and appropriate rate limiting. Avoid returning raw database errors, secrets or stack traces.
7. Prevent XSS: render untrusted text as text, sanitize only when rich HTML is genuinely required, and never use unsafe HTML injection without a reviewed sanitizer.
8. Protect state-changing requests against CSRF according to the framework's guarantees and the route's authentication model. Validate origin where appropriate. Use secure, HttpOnly, SameSite cookies; never put session tokens in browser storage.
9. Minimize data returned to the browser. Select only required columns; never serialize secrets, private metadata or records from another tenant.
10. Never log credentials, access tokens, session cookies, private documents, payroll details or unnecessary personal/financial data.
11. Treat file uploads and downloads as hostile: private storage, server-authorized paths, strict size/type limits, content validation and malware scanning before release. Never trust file extensions or browser MIME types alone.
12. Add negative tests for unauthorized roles, cross-tenant access, unauthenticated requests, forged identifiers and invalid state transitions.

## Implementation constraints

- Follow the existing Next.js App Router conventions and server/client component boundaries.
- Keep data access and business logic on the server where possible. Client Components are for necessary interactivity only.
- Never create a second design system or bypass `docs/POLYGEST_DESIGN_SYSTEM.md`.
- Do not weaken RLS, CSP, security headers, lint rules, type checks, dependency audits or CI to make a feature pass.
- Do not add a dependency without demonstrating a concrete need and reviewing maintenance, bundle and security impact.
- Do not use mock data in production-connected screens or present fixtures as real records.
- Do not change business rules or scope from the approved cahier des charges.

## Required review before completion

- Review every new `use client`, browser API, environment variable, Supabase import, server action, route handler, URL parameter, file operation and logging statement.
- Inspect the production client bundle for accidental server-only imports or secret-like values when the change affects configuration or data boundaries.
- Run lint, TypeScript, focused tests, security/tenant-isolation tests and production build.
- Verify keyboard navigation, focus visibility, labels, contrast, reduced motion and mobile behavior.
- Confirm no unauthorized path is possible by direct request, not only through the UI.
- Record any unverified deployment or hosted-service control as an open risk; never claim a security guarantee based only on local tests.

If a visual instruction conflicts with the cahier des charges, PolyGest design system, accessibility, privacy or security requirements, the latter take precedence.
