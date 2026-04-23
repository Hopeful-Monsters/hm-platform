# UI/UX Improvements Design

**Date:** 2026-04-23  
**Branch:** fix/workflow-errors  
**Scope:** Two PRs — Auth features, then full-site consistency + accessibility

---

## Constraints

- No hardcoded inline styles anywhere. All styles via CSS classes, Tailwind utilities, or CSS custom properties (`var(--token)`). Inline styles are permitted only where a value cannot be expressed statically (e.g. a runtime-computed width).
- Do not change the overall visual design — this is a polish and compliance pass, not a redesign.
- WCAG AA compliance target.

---

## PR 1: Auth Features

### 1. Password Strength Checklist

**Replaces:** The static text block on the signup page listing all password requirements.

**Component:** `PasswordStrengthChecklist` — a new component in `/src/components/ui/`.

**Requirements displayed:**
1. At least 8 characters
2. Lowercase letter (a–z)
3. Uppercase letter (A–Z)
4. Number (0–9)
5. Special character

**Behaviour:**
- Takes `password: string` as its only prop.
- Each requirement row: small icon + label text.
- State per requirement:
  - **Neutral** (default, before typing): dim text, empty circle icon
  - **Met**: accent colour, checkmark icon
  - **Unmet after blur**: error colour, X icon
- Uses `aria-live="polite"` so screen readers announce changes as the user types.
- Rendered directly below the password input on the signup page.
- Also used on the `/reset-password` page (new password field).
- Submit button remains enabled regardless — server-side validation is the source of truth.

**Styling:** Uses `.hm-helper-text` container, design tokens for colour states (`--accent-label`, `--error`, `--text-dim`).

---

### 2. Password Reset Flow

#### 2a. `/forgot-password` page

**Layout:** Existing auth card pattern — `.auth-page-shell` > `.auth-card` > fade-up animation.

**Content:**
- Eyebrow: "ACCOUNT"
- Heading: "Forgot Password." (display style matching login/signup headings)
- Single email input (`.hm-label` / `.hm-input`)
- Submit button: "Send Reset Link →" (default Button variant, full width)
- "Back to sign in" link below button (`.hm-link`)

**On submit:**
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
- Transitions in-place to a success state: "Check your inbox." heading + "We've sent a reset link to [email]." body text
- Always shows success state regardless of whether the email exists — prevents user enumeration

**Error handling:**
- Network/service errors shown in `.hm-error-banner` above the form

---

#### 2b. `/reset-password` page

**Layout:** Same auth card pattern.

**Content:**
- Eyebrow: "ACCOUNT"
- Heading: "New Password."
- New password input + `PasswordStrengthChecklist` below it
- Confirm password input
- Submit button: "Update Password →"

**On load:**
- Exchanges the token from the URL hash via `supabase.auth.exchangeCodeForSession()`
- If token is invalid or expired: shows an error state with a link back to `/forgot-password`

**On submit:**
- Validates new password === confirm password client-side (inline field error if not)
- Calls `supabase.auth.updateUser({ password: newPassword })`
- On success: redirects to `/login?reset=success`

**Error handling:**
- Supabase errors (weak password, expired session) shown in `.hm-error-banner`

---

#### 2c. Login page updates

- Add "Forgot password?" link right-aligned below the password field. Styling: `.hm-link`, 12px, `--text-dim` colour until hover.
- Handle `?reset=success` query param: show a success banner ("Password updated. Sign in with your new password.") above the form using a new `.hm-success-banner` class (mirrors `.hm-error-banner` but with `--accent` left border and dark surface background).

---

## PR 2: Consistency + Accessibility

### 3. Full-Site Consistency Pass

#### 3a. Inline styles → design system

Pages that currently use inline style objects (home `/page.tsx`, `/admin/page.tsx`, `/admin/approvals/page.tsx`, `/support/page.tsx`, `AdminSidebarClient.tsx`, `ToolHeader.tsx`) are migrated to:

- **Card layouts** → use the existing `Card` / `CardHeader` / `CardContent` components with the `variant` prop for left accent border (yellow/pink/blue/dim)
- **Buttons** → use the `Button` component with the appropriate variant and size
- **Typography** → use `.display-xl`, `.display-lg`, `.display-md`, `.display-sm`, `.eyebrow`, `.subhead`, `.body-md`, `.label-nav` classes
- **Colours** → CSS custom properties only (`var(--accent)`, `var(--text-muted)`, etc.)
- **Layout/spacing** → Tailwind utilities or new utility classes in `globals.css` as needed

#### 3b. Duplicate tool CSS consolidation

**Problem:** `coverage-tracker.css` and `expenses-manager.css` share near-identical patterns under different prefixes (`ct-*` vs `em-*`). `StepIndicator` and `WizardContext` are duplicated.

**Solution:**
- Create `/src/components/tool/` directory
- Move shared `StepIndicator` → `/src/components/tool/StepIndicator.tsx` (accepts `steps`, `currentStep`, `tool` props)
- Move shared `WizardContext` → `/src/components/tool/WizardContext.tsx`
- Create `/src/app/tool.css` with shared tool-scoped styles using `[data-tool]` selector (no prefix duplication)
- Delete per-tool CSS files and replace with thin override files for any tool-specific values only
- Update imports in both tool layouts

#### 3c. Auth form consistency

- All `.hm-label` elements get `htmlFor` matching their input's `id`
- Inline field error pattern established: `.hm-field-error` class (12px, `--error` colour, 6px margin-top) rendered below the relevant input
- Spacing rhythm standardised: 8px label→input gap, 6px input→helper/error gap, 20px between field groups
- Button variants: `outline` for "Continue with Google", `nav` reserved for header navigation only

#### 3d. Admin sidebar + ToolHeader

- Inline styles replaced with Tailwind utilities and CSS custom properties
- No functional changes

---

### 4. WCAG AA Audit

#### 4a. Colour contrast

- Audit all text/background combinations in both light and dark modes against WCAG AA thresholds (4.5:1 normal text, 3:1 large text)
- Focus on: `--text-muted` on various surfaces, `--accent` (#ef3e23) used as foreground in light mode at small sizes, any inline colour that was missed in the 3a migration
- Fix by adjusting token values or context-specific overrides — not by changing the design palette broadly

#### 4b. Focus indicators

- Add consistent `:focus-visible` outline to `globals.css` targeting all interactive elements: buttons, links, inputs, checkboxes, selects, nav items, theme toggle
- Style: 2px solid `var(--accent)`, 2px offset — matches existing input focus style for coherence
- Remove any `outline: none` without a replacement

#### 4c. Form semantics

- All `<label htmlFor>` → matching `<input id>` across every form (auth, support, admin, tool forms)
- Error messages linked via `aria-describedby` on their input
- Required fields get `aria-required="true"`
- The `PasswordStrengthChecklist` uses `aria-live="polite"`
- The `.hm-error-banner` gets `role="alert"`

#### 4d. Interactive element labels

- Icon-only buttons get `aria-label`: theme toggle ("Toggle theme"), mobile menu open ("Open menu"), mobile menu close ("Close menu"), settings button ("Open settings")
- `RequestAccessButton` state transitions use `aria-live="polite"`
- Mobile nav overlay: `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation menu"`

#### 4e. Touch targets

- Minimum 44×44px for all interactive elements
- Primarily affects: theme toggle, compact sign-out button, small admin action buttons, mobile nav close button
- Fix via padding adjustments — no visual size change required for most

#### 4f. Heading hierarchy

- Audit all pages for correct `h1`→`h2`→`h3` order (admin pages appear to skip levels)
- Each page should have exactly one `h1`
- Wizard step headings use correct level relative to page `h1`
- Tool wizard step indicators use `aria-current="step"` on the active step

---

### 5. Additional Audits

#### 5a. `prefers-reduced-motion`

- Add `@media (prefers-reduced-motion: reduce)` block to `globals.css`
- Disable or reduce: `.animate-fade-up`, `.animate-pop-in`, `.spin` animations
- Framer Motion: pass `transition={{ duration: 0 }}` or use `useReducedMotion()` hook in `MobileNav` and any other animated components

#### 5b. Responsive / mobile layout

- Audit all pages at 375px, 768px, 1024px breakpoints
- Coverage Tracker and Expenses Manager wizards: ensure multi-column layouts stack gracefully
- Admin pages: the fixed 240px sidebar grid breaks on mobile — collapse it to a hamburger or stacked top nav. Implementation choice is left to the developer; the constraint is that the layout must not overflow or require horizontal scrolling below 768px.
- Fix any overflow, truncation, or tap-target issues discovered

#### 5c. Loading & empty states

- Standardise loading pattern: use a shared `<LoadingSpinner />` component or Tailwind skeleton class for all data-fetching pages
- Standardise empty state pattern: a shared `<EmptyState message="..." />` component for lists/tables with no data
- Apply consistently across: tool grid (home page), admin approvals list, admin users table, expenses job picker

#### 5d. Dark / light mode completeness

- Any colour not using a CSS custom property will break in one mode. The 3a inline-style migration resolves most of these.
- After migration, run a manual check of all pages in both modes to catch any remaining hardcoded values
- Date inputs in `expenses-manager.css` have a `.color-scheme` class — verify this adapts correctly in both modes

---

## File Impact Summary

### New files
- `/src/components/ui/PasswordStrengthChecklist.tsx`
- `/src/components/tool/StepIndicator.tsx`
- `/src/components/tool/WizardContext.tsx`
- `/src/app/(auth)/forgot-password/page.tsx`
- `/src/app/(auth)/reset-password/page.tsx`
- `/src/app/tool.css`
- `/src/components/tool/LoadingSpinner.tsx`
- `/src/components/tool/EmptyState.tsx`

### Modified files (PR 1)
- `/src/app/(auth)/signup/page.tsx` — add PasswordStrengthChecklist
- `/src/app/(auth)/login/page.tsx` — add forgot password link, reset success banner
- `/src/app/globals.css` — add `.hm-success-banner`

### Modified files (PR 2)
- `/src/app/globals.css` — focus styles, reduced-motion, `.hm-field-error`, shared utilities
- `/src/app/page.tsx` — inline → design system
- `/src/app/support/page.tsx` — inline → design system
- `/src/app/admin/page.tsx` — inline → design system
- `/src/app/admin/approvals/page.tsx` — inline → design system, aria
- `/src/app/admin/users/UsersClient.tsx` — aria, touch targets
- `/src/components/SiteHeader.tsx` — aria labels, inline → design system
- `/src/components/navigation.tsx` — aria, focus, mobile nav dialog role
- `/src/components/AdminSidebarClient.tsx` — inline → design system, heading hierarchy
- `/src/components/ToolHeader.tsx` — inline → design system
- `/src/components/RequestAccessButton.tsx` — aria-live
- `/src/components/ThemeToggle.tsx` — aria-label, touch target
- `/src/components/SignOutButton.tsx` — touch target
- `/src/app/coverage-tracker/layout.tsx` — use shared StepIndicator/WizardContext
- `/src/app/expenses-manager/layout.tsx` — use shared StepIndicator/WizardContext
- `/src/app/coverage-tracker/coverage-tracker.css` — refactor to tool.css
- `/src/app/expenses-manager/expenses-manager.css` — refactor to tool.css
- `/src/app/coverage-tracker/page.tsx` — reduced-motion, responsive fixes
- `/src/app/expenses-manager/_components/*.tsx` — reduced-motion, responsive fixes, empty/loading states

### Deleted files
- `/src/app/coverage-tracker/_components/WizardContext.tsx`
- `/src/app/expenses-manager/_components/WizardContext.tsx`
- `/src/app/coverage-tracker/_components/StepIndicator.tsx`
- `/src/app/expenses-manager/_components/StepIndicator.tsx`
