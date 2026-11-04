# Frontend Design Principles

Use these principles for visually ambitious work or when an interface is drifting toward generic SaaS layouts.

## Working model

Before implementation, define:
- Visual thesis: mood, material, tone and energy in one sentence.
- Content plan: the role and order of each section or working area.
- Motion thesis: 2–3 transitions that improve hierarchy or affordance, or no motion when unnecessary.

Inspect the existing product and design system first. PolyGest uses an established design system; preserve its tokens, typography, components and visual language.

## Design system

Define or reuse:
- colors: canvas, surface, text, muted, border, accent and semantic states;
- type roles: display, headline, body and caption;
- spacing rhythm and content width;
- component rules for cards, pills, badges, borders and tables.

Do not create a parallel design system. The authoritative tokens are in `docs/POLYGEST_DESIGN_SYSTEM.md`.

## Application and dashboard guidance

- Start with the task surface: table, chart, filter bar, editor, queue or form.
- Use calm surfaces, strong typography and minimal chrome.
- Prefer clear headings, useful data density and concise operational copy.
- Use cards only when they represent a meaningful interaction or grouping.
- Keep persistent navigation and controls from obscuring content at every breakpoint.

## Responsive and accessible behavior

- Design desktop, tablet and mobile together.
- Ensure keyboard access, visible focus, semantic structure, accessible labels and adequate contrast.
- Respect reduced-motion preferences.
- Include loading, empty, error, success, disabled and unauthorized states.
- Never rely on color alone to communicate status.

## Imagery and motion

- Use imagery only when it carries real product or narrative value.
- Avoid decorative stock imagery, fake 3D assets and text-heavy images in business screens.
- Motion must clarify hierarchy, feedback or affordance; keep it restrained and performant.

## Failure patterns

Reject:
- generic dashboard card mosaics;
- marketing heroes inside operational screens without a product reason;
- decorative charts or fabricated metrics;
- inconsistent spacing, typography or color systems;
- controls that are inaccessible or hidden behind ambiguous icons;
- fixed elements that cover content;
- motion that ignores reduced-motion preferences;
- any design that weakens privacy, security or task completion.

Visual quality never overrides the PolyGest security standard.
