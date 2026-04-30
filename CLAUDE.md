@AGENTS.md

# Coding Profile

## Output
- Return code first. Explanation after, only if non-obvious.
- No inline prose. Use comments sparingly - only where logic is unclear.
- No boilerplate unless explicitly requested.

## Code Rules
- Simplest working solution. No over-engineering.
- No abstractions for single-use operations.
- No speculative features or "you might also want..."
- Read the file before modifying it. Never edit blind.
- No docstrings or type annotations on code not being changed.
- No error handling for scenarios that cannot happen.
- Three similar lines is better than a premature abstraction.

## Review Rules
- State the bug. Show the fix. Stop.
- No suggestions beyond the scope of the review.
- No compliments on the code before or after the review.

## Debugging Rules
- Never speculate about a bug without reading the relevant code first.
- State what you found, where, and the fix. One pass.
- If cause is unclear: say so. Do not guess.

## Simple Formatting
- No em dashes, smart quotes, or decorative Unicode symbols.
- Plain hyphens and straight quotes only.
- Natural language characters (accented letters, CJK, etc.) are fine when the content requires them.
- Code output must be copy-paste safe.

# HM Platform — Project Context

## Stack
- Next.js 16 App Router (RSC + client components), React 19, TypeScript
- Supabase (auth + Postgres via `@supabase/ssr`) — browser client: `@/lib/supabase/client`, server client: `@/lib/supabase/server`
- Tailwind CSS v4 (no config file — all tokens in `src/app/globals.css` via `@theme inline`)
- Framer Motion v12, Lucide icons, CVA for button variants

## Design System
- **Tokens:** All colours, spacing tokens, and fonts are CSS custom properties in `src/app/globals.css`. Never use hardcoded hex values — use `var(--token)` or Tailwind utilities mapped from the `@theme inline` block.
- **No inline styles:** Inline `style={{}}` props violate the nonce-based CSP in production. Use Tailwind utilities or CSS classes in `globals.css` / tool CSS files instead. The only exception is Framer Motion animation values.
- **Typography:** Barlow Condensed (headings/nav/labels via `--font-heading`) + Inter (body via `--font-sans`). Use `.display-xl/lg/md/sm`, `.eyebrow`, `.subhead`, `.body-md`, `.label-nav` classes.
- **Components:** `src/components/ui/` — Button (CVA, variants: default/outline/ghost/danger/nav), Card (accent prop), Badge, Toast. Shared tool components in `src/components/tool/`.
- **Auth pages** share `.auth-page-shell`, `.auth-card`, `.hm-input`, `.hm-label`, `.hm-error-banner`, `.hm-success-banner` CSS classes.

## Routes
- `/(auth)/` — login, signup, forgot-password, reset-password, no-access, callback
- `/` — home dashboard (unauthenticated landing / pending / approved tool grid)
- `/coverage-tracker` — 4-step CSV upload wizard
- `/expenses-manager` — 4-step expense submission wizard
- `/support` — support form
- `/admin` — admin dashboard, approvals, users (role-gated)

## Auth
- Supabase auth with email/password + Google OAuth
- User metadata: `status` (pending | approved) and `role` (admin | editor | viewer)
- Access control is enforced in both middleware and page-level server components
- Password reset uses `/callback?next=/reset-password` as the redirect target

## Tool Architecture
- Each tool has: `layout.tsx` (WizardProvider + ToolHeader), `page.tsx`, `_components/`, and a scoped CSS file
- Shared wizard components: `src/components/tool/WizardContext.tsx`, `src/components/tool/StepIndicator.tsx`
- Shared tool CSS: `src/app/tool.css` (scoped to `[data-tool]`)
- Tool-specific CSS files only contain overrides beyond the shared styles

## Key Conventions
- Server components fetch data; client components handle interaction
- `getCurrentUser()` in `src/lib/auth` is memoised via React `cache()` — safe to call multiple times per request
- WCAG AA target — all interactive elements need `:focus-visible` outlines, `aria-label` on icon-only buttons, `htmlFor`/`id` pairs on all form fields
- Verification: `npm run type-check` (TypeScript), `npm run lint` (ESLint), `npm run build` (full build). No test framework is configured.
