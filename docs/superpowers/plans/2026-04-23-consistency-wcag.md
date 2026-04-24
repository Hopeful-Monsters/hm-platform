# Consistency + WCAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all inline styles site-wide (CSP requirement), consolidate duplicate tool CSS and components, and achieve WCAG AA compliance across all pages.

**Architecture:** All styles expressed via Tailwind utilities or CSS classes in `globals.css` / `tool.css`. Shared tool components (`StepIndicator`, `WizardContext`) extracted to `/src/components/tool/`. WCAG fixes applied across all interactive elements (focus rings, ARIA labels, form semantics, touch targets, reduced-motion). No functional changes.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Framer Motion v12, TypeScript, Lucide icons

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/app/globals.css` | Add component CSS classes, focus indicators, reduced-motion, page-level utilities |
| Modify | `src/components/ThemeToggle.tsx` | Remove inline styles/JS hover, add `aria-label`, ensure 44px touch target |
| Modify | `src/components/SignOutButton.tsx` | Remove inline styles/JS hover |
| Modify | `src/components/SiteHeader.tsx` | Remove inline styles |
| Modify | `src/components/navigation.tsx` | Remove inline styles from MobileNav, add ARIA dialog role |
| Modify | `src/components/ToolHeader.tsx` | Remove inline styles |
| Modify | `src/components/AdminSidebarClient.tsx` | Remove inline styles, heading hierarchy fix |
| Create | `src/components/tool/WizardContext.tsx` | Shared wizard context |
| Create | `src/components/tool/StepIndicator.tsx` | Shared step indicator |
| Create | `src/components/tool/LoadingSpinner.tsx` | Shared loading state |
| Create | `src/components/tool/EmptyState.tsx` | Shared empty state |
| Create | `src/app/tool.css` | Shared tool scoped styles |
| Modify | `src/app/coverage-tracker/_components/WizardContext.tsx` | Re-export from shared |
| Modify | `src/app/coverage-tracker/_components/StepIndicator.tsx` | Re-export from shared |
| Modify | `src/app/coverage-tracker/coverage-tracker.css` | Remove duplicate wizard step classes |
| Modify | `src/app/coverage-tracker/layout.tsx` | Import tool.css |
| Modify | `src/app/expenses-manager/_components/WizardContext.tsx` | Re-export from shared |
| Modify | `src/app/expenses-manager/_components/StepIndicator.tsx` | Re-export from shared |
| Modify | `src/app/expenses-manager/expenses-manager.css` | Remove duplicate wizard step classes |
| Modify | `src/app/expenses-manager/layout.tsx` | Import tool.css |
| Modify | `src/app/page.tsx` | Remove inline styles |
| Modify | `src/app/admin/page.tsx` | Remove inline styles, ARIA/heading fix |
| Modify | `src/app/admin/approvals/page.tsx` | Remove inline styles, ARIA fixes |
| Modify | `src/app/support/page.tsx` | Remove inline styles |

---

## Task 1: globals.css — component classes, focus rings, reduced-motion

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append component CSS classes after the existing `.hm-action-row` block**

Add after the last existing rule:

```css
/* ══ GLOBAL FOCUS INDICATOR ═════════════════════════════════════ */

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Remove default outline only when focus-visible is defined */
:focus:not(:focus-visible) {
  outline: none;
}

/* ══ REDUCED MOTION ══════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-pop-in {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .spin {
    animation: none;
  }
  * {
    transition-duration: 0.01ms !important;
  }
}

/* ══ SITE HEADER ═════════════════════════════════════════════════ */

.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-h);
  background: var(--bg);
  border-bottom: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 1000;
  gap: 16px;
}

.site-header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
}

.site-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.site-header-logo {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 17px;
  letter-spacing: 0.2em;
  color: var(--accent);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.site-header-nav-link {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 6px 12px;
  color: var(--text-muted);
  transition: color 0.15s;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.site-header-nav-link:hover { color: var(--text); }

.site-header-signup {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 7px 16px;
  display: inline-flex;
  align-items: center;
  background: var(--accent);
  color: var(--accent-fg);
  transition: opacity 0.15s;
  min-height: 44px;
}
.site-header-signup:hover { opacity: 0.8; }

.site-header-spacer {
  height: var(--nav-h);
}

/* ══ ICON BUTTON (theme toggle, mobile menu) ═════════════════════ */

.btn-icon {
  background: none;
  border: 2px solid var(--border-2);
  color: var(--text-muted);
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s;
  border-radius: 0;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
}
.btn-icon:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ══ SIGN-OUT BUTTON ═════════════════════════════════════════════ */

.btn-sign-out {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: none;
  border: 2px solid var(--border-2);
  color: var(--text-muted);
  padding: 6px 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s;
  border-radius: 0;
  flex-shrink: 0;
  min-height: 44px;
}
.btn-sign-out:hover {
  border-color: var(--pink);
  color: var(--pink);
}
.btn-sign-out--compact {
  font-size: 12px;
  padding: 5px 10px;
}

/* ══ MOBILE NAV ══════════════════════════════════════════════════ */

.mobile-nav-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  width: 280px;
  background: var(--surface);
  border-left: 2px solid var(--border);
  display: flex;
  flex-direction: column;
}

.mobile-nav-header {
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 2px solid var(--border);
  flex-shrink: 0;
}

.mobile-nav-items {
  padding: 16px 0;
  flex: 1;
}

.mobile-nav-footer {
  border-top: 2px solid var(--border);
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ══ TOOL HEADER ═════════════════════════════════════════════════ */

.tool-header {
  background: var(--surface);
  border-bottom: 2px solid var(--border);
  display: flex;
  align-items: stretch;
  height: var(--tool-nav-h);
  position: sticky;
  top: var(--nav-h);
  z-index: 30;
}

.tool-header-name {
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-right: 2px solid var(--border);
  flex-shrink: 0;
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--accent);
  white-space: nowrap;
}

.tool-header-center {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.tool-header-tab {
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  text-decoration: none;
  color: var(--text-dim);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  height: 100%;
}
.tool-header-tab:hover { color: var(--text); }
.tool-header-tab--active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tool-header-actions {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-left: 2px solid var(--border);
  flex-shrink: 0;
}

/* ══ ADMIN SIDEBAR ═══════════════════════════════════════════════ */

.admin-sidebar {
  background: var(--surface);
  border-right: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.admin-sidebar-header {
  padding: 24px 20px 20px;
  border-bottom: 2px solid var(--border);
}

.admin-sidebar-heading {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 28px;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: var(--text);
  line-height: 0.92;
}

.admin-sidebar-nav {
  flex: 1;
  padding: 12px 0;
}

.admin-sidebar-link {
  display: block;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  text-decoration: none;
  padding: 10px 20px;
  border-left: 3px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  color: var(--text-muted);
}
.admin-sidebar-link:hover {
  color: var(--text);
  border-left-color: var(--border-2);
}
.admin-sidebar-link--active {
  color: var(--accent);
  border-left-color: var(--accent);
}

.admin-sidebar-footer {
  padding: 16px 20px;
  border-top: 2px solid var(--border);
}

.admin-sidebar-footer-label {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.admin-sidebar-footer-email {
  font-size: 13px;
  color: var(--text-muted);
  word-break: break-all;
}

/* ══ PAGE-LEVEL UTILITIES ════════════════════════════════════════ */

/* Reusable page-width container */
.page-section {
  padding: 48px 32px;
}

.page-section--narrow {
  max-width: 720px;
}

/* Admin page header */
.page-heading {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 48px;
  text-transform: uppercase;
  color: var(--text);
  line-height: 0.92;
  letter-spacing: -0.01em;
  margin-bottom: 36px;
}

/* Card grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2px;
}

/* Tool card grid (slightly wider min) */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2px;
}

/* Hero landing (unauthenticated) */
.hero-landing {
  min-height: calc(100vh - var(--nav-h));
  display: flex;
  align-items: center;
  background: var(--accent);
}

.hero-landing-inner {
  width: 100%;
  padding: 80px 32px 72px;
}

.hero-cta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-cta-primary {
  background: var(--accent-fg);
  color: var(--accent);
  transition: opacity 0.15s, transform 0.15s;
}
.hero-cta-primary:hover {
  opacity: 0.85;
  transform: translateY(-2px);
}

.hero-cta-ghost {
  background: transparent;
  border: 2px solid var(--accent-fg);
  color: var(--accent-fg);
  transition: background 0.15s;
}
.hero-cta-ghost:hover { background: rgba(0, 0, 0, 0.1); }

/* Outlined "bold" text on accent hero */
.text-outline-on-accent {
  -webkit-text-stroke: 3px var(--accent-fg);
  color: transparent;
  font-style: italic;
}

/* Hero tool preview cards (on yellow bg) */
.hero-preview-card {
  background: rgba(0, 0, 0, 0.08);
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-left: 4px solid rgba(0, 0, 0, 0.25);
  padding: 22px 24px;
}

.hero-preview-eyebrow {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.hero-preview-title {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 26px;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: var(--accent-fg);
  line-height: 0.95;
  margin-bottom: 10px;
}

.hero-preview-desc {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.55;
}

/* Dashboard hero (authenticated) */
.dashboard-hero {
  background: var(--accent);
  padding: 48px 32px 40px;
  position: relative;
  overflow: hidden;
}

.dashboard-hero-inner {
  position: relative;
  z-index: 1;
}

.dashboard-hero-eyebrow {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 11px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

/* Watermark "HM" in hero */
.watermark {
  font-family: var(--font-heading);
  font-weight: 900;
  text-transform: uppercase;
  position: absolute;
  font-size: 30vw;
  line-height: 1;
  color: rgba(0, 0, 0, 0.045);
  bottom: -30px;
  right: -10px;
  pointer-events: none;
  user-select: none;
}

/* Pending approval page reuses auth-page-shell */
.pending-body {
  font-size: 16px;
  color: var(--text-muted);
  line-height: 1.65;
  margin-bottom: 32px;
}

/* Tool card (accessible, links to tool) */
.tool-card {
  display: block;
  background: var(--surface);
  border: 2px solid var(--border);
  border-left: 4px solid var(--accent);
  padding: 32px 28px;
  height: 100%;
  text-decoration: none;
}

.tool-card-label {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 30px;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: var(--text);
  line-height: 0.95;
  margin-bottom: 12px;
}

.tool-card-desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.65;
  margin-bottom: 24px;
}

.tool-card-cta {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
}

/* Locked tool card (no access) */
.tool-card--locked {
  background: var(--surface);
  border: 2px solid var(--border);
  border-left: 4px solid var(--border-2);
  padding: 32px 28px;
  opacity: 0.75;
}

/* Admin card (same structure as tool-card but dynamic accent) */
.admin-card {
  display: block;
  background: var(--surface);
  border: 2px solid var(--border);
  padding: 28px 24px;
  height: 100%;
  text-decoration: none;
}

.admin-card-heading {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 26px;
  text-transform: uppercase;
  color: var(--text);
  line-height: 0.95;
  margin-bottom: 10px;
}

.admin-card-desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.65;
}

/* Tool section on dashboard */
.tools-section {
  background: var(--bg);
  padding: 48px 32px;
  max-width: 1100px;
  margin: 0 auto;
}

/* Admin page layout */
.admin-content {
  padding: 36px 40px;
}

/* Support page layout */
.support-page {
  padding: 48px 32px;
  max-width: 720px;
}

.support-divider {
  height: 1px;
  background: var(--border);
  margin: 32px 0;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors (globals.css changes have no TypeScript impact).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(styles): add component CSS classes, focus indicators, reduced-motion utilities"
```

---

## Task 2: ThemeToggle — Tailwind + WCAG

**Files:**
- Modify: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Replace file content**

```tsx
'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="btn-icon"
    >
      {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "feat(a11y): migrate ThemeToggle to CSS classes, add aria-label, 44px touch target"
```

---

## Task 3: SignOutButton — CSS classes

**Files:**
- Modify: `src/components/SignOutButton.tsx`

- [ ] **Step 1: Replace file content**

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignOutButtonProps {
  compact?: boolean
}

export default function SignOutButton({ compact = false }: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      aria-label="Sign out"
      className={cn('btn-sign-out', compact && 'btn-sign-out--compact')}
    >
      <LogOut size={compact ? 12 : 14} aria-hidden />
      {!compact && 'Sign Out'}
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SignOutButton.tsx
git commit -m "feat(styles): migrate SignOutButton to CSS classes"
```

---

## Task 4: SiteHeader — CSS classes + WCAG

**Files:**
- Modify: `src/components/SiteHeader.tsx`

- [ ] **Step 1: Replace file content**

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/UserProvider'
import ThemeToggle from './ThemeToggle'
import SignOutButton from './SignOutButton'
import { DesktopNav, MobileNav } from './navigation'
import type { User } from '@supabase/supabase-js'

export default function SiteHeader() {
  const serverUser = useUser()
  const [user, setUser]             = useState<User | null>(serverUser)
  const [userTools, setUserTools]   = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || user.user_metadata?.status !== 'approved') {
      setUserTools([])
      return
    }
    const supabase = createClient()
    supabase
      .from('tool_access')
      .select('tool_slug')
      .eq('user_id', user.id)
      .then(({ data }) => setUserTools(data?.map(r => r.tool_slug) ?? []))
  }, [user])

  return (
    <>
      <header className="site-header">
        <div className="site-header-left">
          <Link href="/" className="site-header-logo">
            <span className="hidden sm:inline">HOPEFUL MONSTERS.</span>
          </Link>
          <DesktopNav
            userRole={user?.user_metadata?.role}
            userTools={userTools}
            isAuthenticated={!!user}
          />
        </div>

        <div className="site-header-right">
          <ThemeToggle />

          {user ? (
            <div className="hidden md:flex">
              <SignOutButton />
            </div>
          ) : (
            <>
              <Link href="/login" className="site-header-nav-link hidden sm:inline-flex">
                Sign In
              </Link>
              <Link href="/signup" className="site-header-signup">
                Sign Up
              </Link>
            </>
          )}

          <button
            className="btn-icon flex md:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className="site-header-spacer" aria-hidden />

      <MobileNav
        id="mobile-nav"
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userRole={user?.user_metadata?.role}
        userTools={userTools}
        isAuthenticated={!!user}
      />
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: TypeScript will flag that `MobileNav` doesn't accept an `id` prop yet — this gets fixed in Task 5.

- [ ] **Step 3: Commit after Task 5 fixes the type error**

---

## Task 5: navigation.tsx — CSS classes + WCAG dialog role

**Files:**
- Modify: `src/components/navigation.tsx`

- [ ] **Step 1: Replace file content**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import SignOutButton from './SignOutButton'

interface NavItem {
  href: string
  label: string
  adminOnly?: boolean
  toolSlug?: string
  authOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/expenses-manager',  label: 'Expenses',  toolSlug: 'expenses-manager' },
  { href: '/coverage-tracker',  label: 'Coverage',  toolSlug: 'coverage-tracker' },
  { href: '/support',           label: 'Support',   authOnly: true },
  { href: '/admin',             label: 'Admin',     adminOnly: true },
]

interface NavProps {
  userRole?: string
  userTools: string[]
  isAuthenticated?: boolean
}

function filterItems(
  items: NavItem[],
  userRole?: string,
  userTools: string[] = [],
  isAuthenticated = false
) {
  return items.filter(item => {
    if (item.adminOnly && userRole !== 'admin') return false
    if (item.toolSlug && !userTools.includes(item.toolSlug)) return false
    if (item.authOnly && !isAuthenticated) return false
    return true
  })
}

export function DesktopNav({ userRole, userTools, isAuthenticated }: NavProps) {
  const pathname = usePathname()
  const items = filterItems(navItems, userRole, userTools, isAuthenticated)

  return (
    <nav className="hidden md:flex items-center gap-0">
      {items.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'label-nav px-4 py-2 transition-colors duration-150',
              isActive
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text)] border-b-2 border-transparent'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

interface MobileNavProps extends NavProps {
  id?: string
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ id, isOpen, onClose, userRole, userTools, isAuthenticated }: MobileNavProps) {
  const pathname = usePathname()
  const items = filterItems(navItems, userRole, userTools, isAuthenticated)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="mobile-nav-panel"
          >
            <div className="mobile-nav-header">
              <span className="eyebrow">Menu</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="btn-icon"
                style={{ border: 'none' }}
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <nav className="mobile-nav-items" aria-label="Mobile navigation">
              {items.map(item => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'block border-l-4 transition-colors duration-150',
                      'font-heading font-black text-xl uppercase tracking-[0.1em] no-underline',
                      'py-3 px-5',
                      isActive
                        ? 'text-[var(--accent)] border-l-[var(--accent)]'
                        : 'text-[var(--text-muted)] border-l-transparent hover:text-[var(--text)] hover:border-l-[var(--border-2)]'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mobile-nav-footer">
              <SignOutButton />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit (covers Tasks 4 + 5)**

```bash
git add src/components/SiteHeader.tsx src/components/navigation.tsx
git commit -m "feat(styles,a11y): migrate SiteHeader and navigation to CSS classes, add mobile nav ARIA dialog"
```

---

## Task 6: ToolHeader — CSS classes

**Files:**
- Modify: `src/components/ToolHeader.tsx`

- [ ] **Step 1: Replace file content**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
  href: string
  label: string
}

interface ToolHeaderProps {
  toolName: string
  toolSlug?: string
  tabs?: Tab[]
  children?: React.ReactNode
  actions?: React.ReactNode
}

export default function ToolHeader({ toolName, tabs = [], children, actions }: ToolHeaderProps) {
  const pathname = usePathname()

  return (
    <div className="tool-header">
      <div className="tool-header-name">
        {toolName}
      </div>

      {children ? (
        <div className="tool-header-center">
          {children}
        </div>
      ) : tabs.length > 0 ? (
        <nav className="tool-header-center" aria-label={`${toolName} navigation`}>
          {tabs.map(tab => {
            const isActive = tab.href === pathname
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'tool-header-tab',
                  isActive && 'tool-header-tab--active'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      ) : (
        <div className="tool-header-center" />
      )}

      {actions && (
        <div className="tool-header-actions">
          {actions}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ToolHeader.tsx
git commit -m "feat(styles): migrate ToolHeader to CSS classes"
```

---

## Task 7: AdminSidebarClient — CSS classes + heading fix

**Files:**
- Modify: `src/components/AdminSidebarClient.tsx`

- [ ] **Step 1: Replace file content**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const adminLinks = [
  { href: '/admin',           label: 'Dashboard' },
  { href: '/admin/approvals', label: 'Approvals' },
  { href: '/admin/users',     label: 'Users' },
]

export default function AdminSidebarClient({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-sidebar-header">
        <p className="eyebrow mb-2">Control Panel</p>
        <p className="admin-sidebar-heading">Admin</p>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin pages">
        {adminLinks.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'admin-sidebar-link',
                isActive && 'admin-sidebar-link--active'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {userEmail && (
        <div className="admin-sidebar-footer">
          <p className="admin-sidebar-footer-label">Signed in as</p>
          <p className="admin-sidebar-footer-email">{userEmail}</p>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminSidebarClient.tsx
git commit -m "feat(styles,a11y): migrate AdminSidebarClient to CSS classes, add landmark roles"
```

---

## Task 8: Shared tool WizardContext and StepIndicator

**Files:**
- Create: `src/components/tool/WizardContext.tsx`
- Create: `src/components/tool/StepIndicator.tsx`

- [ ] **Step 1: Create `src/components/tool/WizardContext.tsx`**

```tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type WizardStep = 1 | 2 | 3 | 4

interface WizardContextValue {
  step: WizardStep
  setStep: (s: WizardStep) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1)
  return (
    <WizardContext.Provider value={{ step, setStep }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>')
  return ctx
}
```

- [ ] **Step 2: Create `src/components/tool/StepIndicator.tsx`**

```tsx
'use client'

import { useWizard } from './WizardContext'
import type { WizardStep } from './WizardContext'
import { cn } from '@/lib/utils'

interface Props {
  steps: readonly string[]
}

export default function StepIndicator({ steps }: Props) {
  const { step } = useWizard()

  return (
    <div className="wizard-steps" role="list" aria-label="Progress">
      {steps.map((label, i) => {
        const n = (i + 1) as WizardStep
        const isDone   = step > n
        const isActive = step === n
        return (
          <div key={label} className="wizard-step-row" role="listitem">
            <div
              className={cn(
                'wizard-step',
                isDone   && 'is-done',
                isActive && 'is-active'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="wizard-step-num" aria-hidden>{isDone ? '✓' : n}</span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className="wizard-step-connector" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add src/components/tool/WizardContext.tsx src/components/tool/StepIndicator.tsx
git commit -m "feat(components): add shared WizardContext and StepIndicator"
```

---

## Task 9: tool.css + update Coverage Tracker

**Files:**
- Create: `src/app/tool.css`
- Modify: `src/app/coverage-tracker/coverage-tracker.css`
- Modify: `src/app/coverage-tracker/_components/WizardContext.tsx`
- Modify: `src/app/coverage-tracker/_components/StepIndicator.tsx`
- Modify: `src/app/coverage-tracker/layout.tsx`

The wizard step CSS classes are duplicated in both tool CSS files. This task extracts them into `tool.css`.

- [ ] **Step 1: Find the wizard step rules in coverage-tracker.css**

```bash
grep -n "ct-step" src/app/coverage-tracker/coverage-tracker.css
```

Note the line numbers — you'll delete those blocks in Step 3.

- [ ] **Step 2: Create `src/app/tool.css` with shared wizard step styles**

Copy the wizard step styles from `coverage-tracker.css` (the `.ct-steps`, `.ct-step`, `.ct-step-num`, `.ct-step-connector`, `.ct-step.is-done`, `.ct-step.is-active` blocks) and replace the `ct-` prefix with `wizard-`:

```css
/* Shared wizard step indicator — used by all tools */
[data-tool] .wizard-steps {
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 0;
  overflow-x: auto;
  height: 100%;
}

[data-tool] .wizard-step-row {
  display: flex;
  align-items: center;
}

[data-tool] .wizard-step {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  white-space: nowrap;
  height: 100%;
  transition: color 0.15s;
}

[data-tool] .wizard-step.is-active {
  color: var(--accent);
}

[data-tool] .wizard-step.is-done {
  color: var(--text-muted);
}

[data-tool] .wizard-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  font-size: 11px;
  font-weight: 900;
  flex-shrink: 0;
}

[data-tool] .wizard-step-connector {
  width: 24px;
  height: 2px;
  background: var(--border-2);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Delete the `ct-steps` / `ct-step` / `ct-step-num` / `ct-step-connector` blocks from `coverage-tracker.css`**

Open `src/app/coverage-tracker/coverage-tracker.css` and remove the lines containing `.ct-steps`, `.ct-step`, `.ct-step-num`, `.ct-step-connector`, `.ct-step.is-done`, `.ct-step.is-active` (the full rule blocks, not just the declarations).

- [ ] **Step 4: Update `src/app/coverage-tracker/_components/WizardContext.tsx` to re-export from shared**

```tsx
export { WizardProvider, useWizard } from '@/components/tool/WizardContext'
export type { WizardStep } from '@/components/tool/WizardContext'
```

- [ ] **Step 5: Update `src/app/coverage-tracker/_components/StepIndicator.tsx` to re-export from shared**

```tsx
'use client'

import SharedStepIndicator from '@/components/tool/StepIndicator'

const STEPS = ['Upload CSV', 'Setup', 'Review & Submit'] as const

export default function StepIndicator() {
  return <SharedStepIndicator steps={STEPS} />
}
```

- [ ] **Step 6: Update `src/app/coverage-tracker/layout.tsx` to also import `tool.css`**

Add to the existing imports at the top of the file:

```tsx
import '@/app/tool.css'
```

- [ ] **Step 7: Type-check**

```bash
npm run type-check
```

- [ ] **Step 8: Commit**

```bash
git add src/app/tool.css src/app/coverage-tracker/coverage-tracker.css src/app/coverage-tracker/_components/WizardContext.tsx src/app/coverage-tracker/_components/StepIndicator.tsx src/app/coverage-tracker/layout.tsx
git commit -m "refactor(tool): extract shared wizard CSS and components, update Coverage Tracker"
```

---

## Task 10: Update Expenses Manager to use shared tool components

**Files:**
- Modify: `src/app/expenses-manager/expenses-manager.css`
- Modify: `src/app/expenses-manager/_components/WizardContext.tsx`
- Modify: `src/app/expenses-manager/_components/StepIndicator.tsx`
- Modify: `src/app/expenses-manager/layout.tsx`

- [ ] **Step 1: Find the wizard step rules in expenses-manager.css**

```bash
grep -n "em-step" src/app/expenses-manager/expenses-manager.css
```

- [ ] **Step 2: Delete the `em-steps` / `em-step` blocks from `expenses-manager.css`**

Remove the full rule blocks for `.em-steps`, `.em-step`, `.em-step-num`, `.em-step-connector`, `.em-step.is-done`, `.em-step.is-active`.

- [ ] **Step 3: Update `src/app/expenses-manager/_components/WizardContext.tsx`**

```tsx
export { WizardProvider, useWizard } from '@/components/tool/WizardContext'
export type { WizardStep } from '@/components/tool/WizardContext'
```

- [ ] **Step 4: Update `src/app/expenses-manager/_components/StepIndicator.tsx`**

```tsx
'use client'

import SharedStepIndicator from '@/components/tool/StepIndicator'

const STEPS = ['Select Job', 'Upload Receipts', 'Review & Submit'] as const

export default function StepIndicator() {
  return <SharedStepIndicator steps={STEPS} />
}
```

- [ ] **Step 5: Add `tool.css` import to `src/app/expenses-manager/layout.tsx`**

```tsx
import '@/app/tool.css'
```

- [ ] **Step 6: Type-check and build**

```bash
npm run type-check && npm run build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/expenses-manager/expenses-manager.css src/app/expenses-manager/_components/WizardContext.tsx src/app/expenses-manager/_components/StepIndicator.tsx src/app/expenses-manager/layout.tsx
git commit -m "refactor(tool): update Expenses Manager to use shared wizard components"
```

---

## Task 11: Shared LoadingSpinner and EmptyState

**Files:**
- Create: `src/components/tool/LoadingSpinner.tsx`
- Create: `src/components/tool/EmptyState.tsx`

- [ ] **Step 1: Create `src/components/tool/LoadingSpinner.tsx`**

```tsx
export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-12 text-[var(--text-dim)]"
      role="status"
      aria-label={label}
    >
      <span className="spin inline-block w-5 h-5 border-2 border-[var(--border-2)] border-t-[var(--accent)] rounded-full" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/tool/EmptyState.tsx`**

```tsx
interface EmptyStateProps {
  message: string
  detail?: string
}

export function EmptyState({ message, detail }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <p className="eyebrow mb-3">Nothing here</p>
      <p className="display-sm hm-text-muted mb-2">{message}</p>
      {detail && <p className="body-md">{detail}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Add spin animation for spinner if not already in globals.css**

Check if `.spin` animation exists:

```bash
grep -n "\.spin" src/app/globals.css
```

If it exists, skip this step. If not, add to `globals.css`:

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tool/LoadingSpinner.tsx src/components/tool/EmptyState.tsx
git commit -m "feat(components): add shared LoadingSpinner and EmptyState components"
```

---

## Task 12: Home page — inline → design system

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace full file content**

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import RequestAccessButton from '@/components/RequestAccessButton'
import { LoadingSpinner } from '@/components/tool/LoadingSpinner'
import { TOOLS } from '@/lib/tools'

export const metadata: Metadata = {
  title:       'Hopeful Monsters',
  description: 'A curated set of internal tools for expenses, coverage tracking, and administrative workflows — built for teams that move fast.',
  openGraph: {
    title:       'Hopeful Monsters',
    description: 'A curated set of internal tools for expenses, coverage tracking, and administrative workflows — built for teams that move fast.',
    type:        'website',
  },
}

function ToolCard({
  href,
  label,
  description,
  cta,
}: {
  href: string
  label: string
  description: string
  cta: string
}) {
  return (
    <Link href={href} className="tool-card card-hover">
      <p className="eyebrow mb-3">Tool</p>
      <h3 className="tool-card-label">{label}</h3>
      <p className="tool-card-desc">{description}</p>
      <span className="tool-card-cta">{cta} →</span>
    </Link>
  )
}

function ToolGridSkeleton() {
  return (
    <div className="tool-grid">
      {[0, 1].map(i => (
        <div
          key={i}
          className="bg-[var(--surface)] border-2 border-[var(--border)] border-l-4 border-l-[var(--border)] p-8 h-[220px] opacity-50"
          aria-hidden
        />
      ))}
    </div>
  )
}

async function ToolGrid({ userId, role }: { userId: string; role?: string }) {
  const supabase = await createClient()

  const [{ data: toolAccess }, { data: accessRequests }] = await Promise.all([
    supabase.from('tool_access').select('tool_slug').eq('user_id', userId),
    supabase
      .from('tool_access_requests')
      .select('tool_slug')
      .eq('user_id', userId)
      .eq('status', 'pending'),
  ])

  const userTools       = toolAccess?.map(a => a.tool_slug) ?? []
  const pendingRequests = accessRequests?.map(r => r.tool_slug) ?? []

  return (
    <div className="tool-grid">
      {TOOLS.map(tool => {
        const hasAccess = userTools.includes(tool.slug)
        if (hasAccess) {
          return (
            <ToolCard
              key={tool.slug}
              href={`/${tool.slug}`}
              label={tool.label}
              description={tool.description}
              cta="Open"
            />
          )
        }
        const isPending = pendingRequests.includes(tool.slug)
        return (
          <div key={tool.slug} className="tool-card--locked">
            <p className="eyebrow mb-3 hm-text-muted">No access</p>
            <h3 className="tool-card-label hm-text-muted">{tool.label}</h3>
            <p className="tool-card-desc opacity-70 mb-6">{tool.description}</p>
            <RequestAccessButton
              toolSlug={tool.slug}
              toolLabel={tool.label}
              alreadyRequested={isPending}
            />
          </div>
        )
      })}

      {role === 'admin' && (
        <Link href="/admin" className="tool-card card-hover" style={{ borderLeftColor: 'var(--pink)' }}>
          <p className="eyebrow mb-3">Admin only</p>
          <h3 className="tool-card-label">Admin Dashboard</h3>
          <p className="tool-card-desc mb-6">Manage users, approve requests, and control tool access.</p>
          <span className="tool-card-cta">Open →</span>
        </Link>
      )}
    </div>
  )
}

export default async function Home() {
  const user   = await getCurrentUser()
  const status = user?.user_metadata?.status
  const role   = user?.user_metadata?.role

  if (!user) {
    return (
      <div className="hero-landing">
        <section className="hero-landing-inner">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-[1200px] mx-auto">
            <div>
              <h1 className="display-xl hm-accent-fg mb-6">
                Tools for<br />
                <span className="text-outline-on-accent">bold</span> brands.
              </h1>
              <p className="text-lg text-black/65 leading-relaxed max-w-[420px] mb-9 font-medium">
                A curated set of tools for expenses, coverage tracking, and
                administrative workflows — built for teams that move fast.
              </p>
              <div className="hero-cta-row">
                <Link href="/signup" className="btn-hm text-2xl px-10 py-4 hero-cta-primary">
                  Get Started →
                </Link>
                <Link href="/login" className="btn-hm text-2xl px-10 py-4 hero-cta-ghost">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              {TOOLS.map(tool => (
                <div key={tool.slug} className="hero-preview-card">
                  <p className="hero-preview-eyebrow">Tool</p>
                  <h3 className="hero-preview-title">{tool.label}</h3>
                  <p className="hero-preview-desc">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (status !== 'approved') {
    return (
      <div className="auth-page-shell">
        <div className="animate-fade-up text-center max-w-[480px]">
          <p className="eyebrow mb-3">Almost there</p>
          <h1 className="display-lg hm-text mb-5">
            Pending<br />
            <span className="hm-accent italic">Approval.</span>
          </h1>
          <p className="pending-body">
            Your account has been created. An admin will review and approve your access
            shortly — you&rsquo;ll receive an email when you&rsquo;re in.
          </p>
          <SignOutButton />
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="dashboard-hero">
        <span className="watermark" aria-hidden>HM</span>
        <div className="dashboard-hero-inner">
          <p className="dashboard-hero-eyebrow">Your dashboard</p>
          <h1 className="display-lg" style={{ color: 'var(--accent-fg)', lineHeight: 0.9 }}>
            Welcome back,<br />
            {user.email?.split('@')[0]}.
          </h1>
        </div>
      </section>

      <section className="tools-section">
        <p className="eyebrow mb-5">Your tools</p>
        <Suspense fallback={<ToolGridSkeleton />}>
          <ToolGrid userId={user.id} role={role} />
        </Suspense>
      </section>
    </>
  )
}
```

Note: The admin tool card uses one remaining inline style (`borderLeftColor: 'var(--pink)'`) because the `tool-card` CSS class sets `border-left: 4px solid var(--accent)` and overriding it for a single dynamic accent colour requires either an inline style or a separate CSS class. Add `.tool-card--pink { border-left-color: var(--pink); }` to `globals.css` and use that class instead:

Add to globals.css after `.tool-card--locked`:
```css
.tool-card--pink { border-left-color: var(--pink); }
```

Then replace the admin card `style={{ borderLeftColor: 'var(--pink)' }}` with `className="tool-card card-hover tool-card--pink"`.

- [ ] **Step 2: Add `.tool-card--pink` to globals.css**

In `src/app/globals.css`, after the `.tool-card--locked` block, add:

```css
.tool-card--pink { border-left-color: var(--pink); }
```

Also add the `hm-accent-fg` colour helper near the other `.hm-*` colour helpers:

```css
.hm-accent-fg { color: var(--accent-fg); }
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "feat(styles): migrate home page to CSS classes, no inline styles"
```

---

## Task 13: Admin pages — inline → design system + WCAG

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/approvals/page.tsx`

- [ ] **Step 1: Replace `src/app/admin/page.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'

const adminCards = [
  {
    href:        '/admin/approvals',
    label:       'Pending Approvals',
    description: 'Review and approve new user requests. Grant tool access per user.',
    accent:      'yellow' as const,
  },
  {
    href:        '/admin/users',
    label:       'User Management',
    description: 'View all users, update tool access, and promote admins.',
    accent:      'pink' as const,
  },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') redirect('/login')

  return (
    <div className="admin-content">
      <h1 className="page-heading">Dashboard</h1>

      <div className="card-grid">
        {adminCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className={cn('admin-card card-hover', card.accent === 'pink' ? 'border-l-4 border-l-[var(--pink)]' : 'border-l-4 border-l-[var(--accent)]')}
          >
            <h2 className="admin-card-heading">{card.label}</h2>
            <p className="admin-card-desc">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Read the current approvals page to understand its structure**

```bash
head -100 src/app/admin/approvals/page.tsx
```

- [ ] **Step 3: Migrate `src/app/admin/approvals/page.tsx` inline styles to CSS classes**

Open `src/app/admin/approvals/page.tsx`. For each element with `style={{...}}`:
- Replace card wrappers with `className="bg-[var(--surface)] border-2 border-[var(--border)] border-l-4 border-l-[var(--accent)] p-6 mb-3"`
- Replace heading elements with the appropriate `.display-sm` or `.admin-card-heading` class
- Replace body text with `className="body-md"`
- Replace form buttons that are styled inline with `<Button variant="default" size="sm">` / `<Button variant="ghost" size="sm">` from `@/components/ui/button`
- Add `role="alert"` to any error message elements
- Add `aria-required="true"` to required form fields
- Ensure every `<label>` has `htmlFor` matching its input's `id`

Work through the file top-to-bottom, replacing each `style={{}}` prop.

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/approvals/page.tsx
git commit -m "feat(styles,a11y): migrate admin pages to CSS classes"
```

---

## Task 14: Support page — inline → design system

**Files:**
- Modify: `src/app/support/page.tsx`

- [ ] **Step 1: Replace full file content**

```tsx
import type { Metadata } from 'next'
import SupportForm from './SupportForm'

export const metadata: Metadata = {
  title: 'Support — Hopeful Monsters',
}

export default function SupportPage() {
  return (
    <div className="support-page">
      <p className="eyebrow mb-3">Help</p>
      <h1 className="display-md hm-text mb-3">Get help.</h1>
      <p className="subhead mb-8">
        Submit a support request and we&rsquo;ll get back to you as soon as possible.
      </p>

      <div className="support-divider" />

      <SupportForm />
    </div>
  )
}
```

- [ ] **Step 2: Open `src/app/support/SupportForm.tsx` and remove any inline styles**

For each `style={{...}}` prop in SupportForm, replace with:
- Form field groups: `className="mb-4"` / `className="mb-6"`
- Labels: `className="hm-label"`
- Inputs/selects/textareas: `className="hm-input"`
- Submit button: use `<Button>` from `@/components/ui/button`
- Error messages: `className="hm-field-error"` + `role="alert"`
- Success state: `className="hm-success-banner"`
- Add `htmlFor`/`id` pairs to all label+input combinations
- Add `aria-required="true"` to required fields

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add src/app/support/page.tsx src/app/support/SupportForm.tsx
git commit -m "feat(styles,a11y): migrate support page to CSS classes, fix form semantics"
```

---

## Task 15: Responsive audit and fixes

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test each page at 375px (mobile), 768px (tablet), 1024px (desktop)**

Use browser DevTools responsive mode. Pages to check:
- `/` (all three states: landing, pending, dashboard)
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/admin`, `/admin/approvals`, `/admin/users`
- `/support`
- `/coverage-tracker`
- `/expenses-manager`

- [ ] **Step 3: Fix admin layout mobile breakpoint**

The admin layout uses a fixed `gridTemplateColumns: '240px 1fr'`. Open `src/app/admin/layout.tsx` and replace the inline grid with responsive Tailwind:

```tsx
<div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-[calc(100vh-var(--nav-h))]">
  <AdminSidebar />
  <main className="admin-content">
    {children}
  </main>
</div>
```

On mobile (`< md`), the sidebar stacks above content. On md+, the two-column layout applies.

- [ ] **Step 4: Fix any overflow issues in wizard tools**

If Coverage Tracker or Expenses Manager tables/forms overflow horizontally below 768px, add `overflow-x: auto` wrapper classes:

```tsx
<div className="overflow-x-auto">
  {/* table or wide form content */}
</div>
```

- [ ] **Step 5: Commit all responsive fixes**

```bash
git add src/app/admin/layout.tsx
# Add any other modified files
git commit -m "feat(responsive): fix admin layout mobile, wizard tool overflow"
```

---

## Task 16: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

`CLAUDE.md` currently contains only `@AGENTS.md`. Add project-specific context that an AI agent needs to work effectively in this codebase.

- [ ] **Step 1: Replace `CLAUDE.md` with the following content**

```markdown
@AGENTS.md

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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with project context and conventions"
```

---

## Task 17: Final verification

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 4: Manual WCAG spot-check**

With the dev server running (`npm run dev`):

1. Navigate through every page using **keyboard only** (Tab, Shift+Tab, Enter, Space). Every interactive element must receive a visible focus ring (2px solid accent colour).
2. Open DevTools → Accessibility panel. Verify: page has one `<h1>`, heading levels don't skip (`h1 → h2 → h3`), all images have `alt`, all icon-only buttons have `aria-label`.
3. Check dark mode: toggle theme on every page. Verify no element shows a hardcoded colour that doesn't adapt.
4. Check light mode: same as above.
5. Simulate `prefers-reduced-motion: reduce` in DevTools → Rendering. Verify animations don't play.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(a11y,styles): complete consistency and WCAG AA pass across full site"
```
