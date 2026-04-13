# Code Review — hm-platform `main`
**Date:** 2026-04-13  
**Reviewer:** Automated (code-reviewer skill) + manual inspection  
**Scope:** Full codebase, `main` branch  
**Files analysed:** 44 TypeScript/TSX source files  

---

## Verdict: Request Changes

**Overall quality score:** 76/100  
_Updated after verifying Next.js 16 conventions — see correction note below._

The automated grade of A (92.7 average) reflects genuinely clean library and API code. The primary concerns are one structural risk on the extract route and the god component in expenses-manager.

> **Correction (2026-04-13):** The original review incorrectly flagged `proxy.ts` as unwired middleware. In Next.js 16, the middleware file convention was renamed from `middleware.ts` to `proxy.ts`, and the exported function from `middleware` to `proxy`. The codebase is correct. The three "critical" issues from the first pass that depended on this assumption are retracted. The AGENTS.md warning about Next.js breaking changes was accurate and should have been heeded before making that call.

---

## High Issues

### 1. `/api/expenses-manager/extract` — no rate limiting on an AI route

**File:** `src/app/api/expenses-manager/extract/route.ts`

The proxy handles auth for this route, but there is no rate limiting. Every call hits the Gemini API and incurs cost. The `rateLimits.ai` limiter already exists in `src/lib/upstash/ratelimit.ts` and is configured specifically for expensive AI calls (10/min per user). It just isn't applied here. Compare with `notify-admin/route.ts` which correctly calls `applyRateLimit` before doing anything.

Recommended addition at the top of the `POST` handler:

```ts
const userId = // extract from supabase session
const limited = await applyRateLimit(rateLimits.ai, `expenses-manager:extract:${userId}`)
if (limited) return limited
```

### 2. Admin layout has no auth check

**File:** `src/app/admin/layout.tsx`

The expenses-manager and coverage-tracker layouts both check `user` and `user_metadata.status` before rendering. The admin layout renders unconditionally, relying on the proxy and on each child page. `admin/approvals/page.tsx` and `admin/users/page.tsx` have their own checks, but the layout itself is inconsistent with the pattern used elsewhere — if a new admin page is added without a check, the layout provides no backstop.

### 3. Streamtime routes pass unvalidated body directly through

**Files:** `src/app/api/expenses-manager/expenses/route.ts`, `jobs/route.ts`

These routes read the raw request body with `request.text()` and forward it to Streamtime without parsing or validation. The proxy protects auth, but if a caller sends unexpected content (oversized payload, wrong content type), it goes straight to the upstream API. At minimum, add a content-length guard and parse/validate the body shape before forwarding.

---

## Medium Issues

### 5. `expenses-manager/page.tsx` is a 1,427-line god component

**File:** `src/app/expenses-manager/page.tsx`  
**Grade:** F (score: 0)

This is the most structurally problematic file in the codebase. Key metrics:

| Function | Lines | Cyclomatic Complexity |
|---|---|---|
| `g` (Google API init) | 136 | 46 |
| `buildReviewCard` | 125 | 21 |
| `renderQueueList` | 75 | 29 |
| `updateDriveUI` | — | 19 |
| `searchFolders` | — | 17 |

A function with complexity 46 has 46 independent paths through it — it's essentially untestable and very difficult to reason about safely.

This file also uses `(window as any).google` to access the Google API, bypassing TypeScript's type system entirely for a large section of the integration logic.

The file should be broken up: Google Drive integration into a dedicated module, queue rendering into a child component, and the review card into its own component. This is the single biggest maintainability liability in the codebase.

### 6. Magic numbers throughout UI code (107 instances)

Predominantly pixel values hardcoded in inline styles (e.g. `900`, `700`, `480`, `1100`). This makes responsive design changes error-prone — the same value appears in multiple places with no shared reference. CSS custom properties or a constants file would solve this.

---

## Low / Informational

### 7. Recent CodeQL fixes may not be complete

The last 6 commits on main were all attempts to fix CodeQL findings (`Incomplete string escaping or encoding`, `DOM text reinterpreted as HTML`). The commit messages suggest iterative trial-and-error rather than a confirmed fix. Worth verifying the CodeQL alerts are actually resolved in the current state — if the repo has GitHub Actions configured, check the latest workflow run.

### 8. `ADMIN_EMAIL` fallback is a placeholder

**File:** `src/app/api/auth/notify-admin/route.ts` (line: `to: process.env.ADMIN_EMAIL || 'admin@hm-platform.com'`)

The fallback `admin@hm-platform.com` is almost certainly not a real address. If `ADMIN_EMAIL` is missing from environment config, new user signup notifications will silently fail to reach anyone. Consider making this a hard failure (`if (!process.env.ADMIN_EMAIL) return Response.json({ error: 'ADMIN_EMAIL not set' }, { status: 500 })`) rather than a silent fallback.

### 7. `proxy.ts` matcher excludes `/auth/` but not `/api/auth/`

The matcher `/((?!_next/static|_next/image|favicon.ico|auth/).*)` excludes paths starting with `auth/` but the notify-admin route is at `/api/auth/notify-admin` — it falls inside the proxy matcher and would be auth-gated. That's probably fine since it only sends an email, but worth being intentional: if the intent was to leave auth-related API routes open, the matcher exclusion should be `/api/auth/` not just `auth/`.

---

## What's Working Well

The majority of the codebase is clean and well-structured:

- Auth flow (`signUp`, `signInWithPassword`, `signInWithOAuth`) is correctly implemented via Supabase
- `service.ts` is correctly isolated with a clear comment warning against misuse
- Rate limiting infrastructure (`upstash/ratelimit.ts`) is well-designed with appropriate tiers (auth/api/ai)
- CORS configuration is strict with an explicit allowlist
- Security headers in `next.config.ts` are comprehensive (HSTS, X-Frame-Options, CSP directives)
- `notify-admin` route is the best-implemented API route: rate limited, Zod-validated, no raw env access
- No hardcoded secrets, no SQL injection patterns, no `any` leaks in library code

---

## Prioritised Action List

| Priority | Action | File(s) |
|---|---|---|
| 🟠 High | Add `rateLimits.ai` rate limiting to extract route | `extract/route.ts` |
| 🟠 High | Add auth guard to admin layout | `admin/layout.tsx` |
| 🟠 High | Validate and guard request body before proxying to Streamtime | `expenses/route.ts`, `jobs/route.ts` |
| 🟡 Medium | Break up `expenses-manager/page.tsx` — extract Google Drive module, queue component, review card | `expenses-manager/page.tsx` |
| 🟡 Medium | Replace `(window as any).google` with typed Google API declarations | `expenses-manager/page.tsx` |
| 🟡 Medium | Verify CodeQL findings are resolved in current build | GitHub Actions |
| 🟢 Low | Replace `ADMIN_EMAIL` fallback with hard failure | `notify-admin/route.ts` |
| 🟢 Low | Clarify proxy matcher intent for `/api/auth/` routes | `src/proxy.ts` |
| 🟢 Low | Extract magic number pixel values to CSS custom properties or constants | Multiple UI files |
