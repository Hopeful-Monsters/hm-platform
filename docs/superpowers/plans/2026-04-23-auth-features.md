# Auth Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time password strength checklist to signup and implement a full password reset flow (forgot password → email → new password page).

**Architecture:** Three new pages under `(auth)` following the existing card/shell pattern. A shared `PasswordStrengthChecklist` component used on both signup and reset-password pages. The existing `/callback` route handles the Supabase code exchange, so `/reset-password` only needs to call `updateUser`. All inline styles replaced with Tailwind utilities or CSS classes — inline styles violate the nonce-based CSP in production.

**Tech Stack:** Next.js 16 App Router, Supabase SSR (`@supabase/ssr`), React 19, Tailwind CSS v4, TypeScript

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/app/globals.css` | Add `.hm-success-banner`, `.hm-checklist`, `.hm-checklist-item`, `.hm-forgot-link`, `.hm-field-error` |
| Create | `src/components/ui/PasswordStrengthChecklist.tsx` | Real-time password requirement checker |
| Modify | `src/app/(auth)/signup/page.tsx` | Add PasswordStrengthChecklist, remove static hint text, replace inline styles with Tailwind |
| Modify | `src/app/(auth)/login/page.tsx` | Add forgot password link, handle `?reset=success` banner, wrap in Suspense, replace inline styles |
| Create | `src/app/(auth)/forgot-password/page.tsx` | Email entry form + in-place success state |
| Create | `src/app/(auth)/reset-password/page.tsx` | New password form (session already established by /callback) |

---

## Task 1: Add CSS classes to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the new classes after the `.hm-action-row` block (end of file)**

```css
/* Success banner — mirrors .hm-error-banner with accent styling */
.hm-success-banner {
  background: #0a1200;
  border-left: 4px solid var(--accent);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--accent-label);
}

/* Forgot password link — right-aligned, dim until hover */
.hm-forgot-link {
  display: block;
  text-align: right;
  font-size: 12px;
  color: var(--text-dim);
  text-decoration: none;
  margin-top: 6px;
}
.hm-forgot-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

/* Inline field-level error text */
.hm-field-error {
  font-size: 12px;
  color: var(--error);
  margin-top: 6px;
  line-height: 1.4;
}

/* Password strength checklist */
.hm-checklist {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 8px;
  margin-bottom: 20px;
}

.hm-checklist-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  line-height: 1.4;
}

.hm-checklist-item--neutral { color: var(--text-dim); }
.hm-checklist-item--met     { color: var(--accent-label); }
.hm-checklist-item--error   { color: var(--error); }

.hm-checklist-icon {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
}
```

- [ ] **Step 2: Run type-check to verify no regressions**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(auth): add CSS classes for password checklist, success/field-error banners"
```

---

## Task 2: Create PasswordStrengthChecklist component

**Files:**
- Create: `src/components/ui/PasswordStrengthChecklist.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useMemo } from 'react'
import { Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Requirement {
  label: string
  test: (pw: string) => boolean
}

const REQUIREMENTS: Requirement[] = [
  { label: 'At least 8 characters',      test: pw => pw.length >= 8 },
  { label: 'Lowercase letter (a–z)',      test: pw => /[a-z]/.test(pw) },
  { label: 'Uppercase letter (A–Z)',      test: pw => /[A-Z]/.test(pw) },
  { label: 'Number (0–9)',                test: pw => /[0-9]/.test(pw) },
  { label: 'Special character',          test: pw => /[!@#$%^&*()_+\-=[\]{};':|<>?,./ ~]/.test(pw) },
]

interface Props {
  password: string
  touched: boolean
}

export function PasswordStrengthChecklist({ password, touched }: Props) {
  const results = useMemo(
    () => REQUIREMENTS.map(r => ({ label: r.label, met: r.test(password) })),
    [password]
  )

  return (
    <div className="hm-checklist" aria-live="polite" aria-label="Password requirements">
      {results.map(({ label, met }) => {
        const state = password.length === 0
          ? 'neutral'
          : met
            ? 'met'
            : touched ? 'error' : 'neutral'

        return (
          <div
            key={label}
            className={cn('hm-checklist-item', `hm-checklist-item--${state}`)}
          >
            {state === 'met'
              ? <Check className="hm-checklist-icon" aria-hidden />
              : state === 'error'
                ? <X className="hm-checklist-icon" aria-hidden />
                : <Minus className="hm-checklist-icon" aria-hidden />
            }
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PasswordStrengthChecklist.tsx
git commit -m "feat(auth): add PasswordStrengthChecklist component"
```

---

## Task 3: Update signup page

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Replace the full file content**

The key changes: import and use `PasswordStrengthChecklist`, add `passwordTouched` state, remove the static hint text block, replace all `style={{}}` props with Tailwind utilities.

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordStrengthChecklist } from '@/components/ui/PasswordStrengthChecklist'
import { notifyAdmin } from './actions'

export default function SignupPage() {
  const [firstName,      setFirstName]      = useState('')
  const [lastName,       setLastName]        = useState('')
  const [email,          setEmail]           = useState('')
  const [password,       setPassword]        = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [loading,        setLoading]         = useState(false)
  const [error,          setError]           = useState('')
  const [success,        setSuccess]         = useState(false)

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          status:     'pending',
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
        },
      },
    })
    if (error) {
      setError(error.message)
    } else {
      notifyAdmin(email).catch(() => {})
      setSuccess(true)
    }
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page-shell">
        <div className="animate-fade-up auth-card text-center">
          <p className="eyebrow mb-3">You&rsquo;re in the queue</p>
          <h1 className="display-lg hm-text mb-5">
            Check your<br />
            <span className="hm-accent italic">inbox.</span>
          </h1>
          <p className="hm-text-muted mb-8" style={undefined}>
            We&rsquo;ve sent a confirmation link to{' '}
            <strong className="hm-text">{email}</strong>.
            Once confirmed, your account will be pending admin approval. You&rsquo;ll hear from us soon.
          </p>
          <Link href="/login" className="hm-link text-sm">
            Back to sign in →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page-shell">
      <div className="animate-fade-up auth-card">
        <p className="eyebrow mb-3">Request access</p>

        <h1 className="display-lg hm-text mb-8">
          Sign <span className="hm-accent italic">Up.</span>
        </h1>

        {error && (
          <div className="hm-error-banner mb-5" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="mb-4">
          <div className="hm-name-row mb-4">
            <div className="hm-field">
              <label className="hm-label" htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                required
                aria-required="true"
                className="hm-input"
              />
            </div>
            <div className="hm-field">
              <label className="hm-label" htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
                required
                aria-required="true"
                className="hm-input"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="hm-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-required="true"
              className="hm-input"
            />
          </div>

          <div>
            <label className="hm-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="Minimum 8 characters"
              required
              aria-required="true"
              aria-describedby="password-checklist"
              className="hm-input"
            />
            <div id="password-checklist">
              <PasswordStrengthChecklist password={password} touched={passwordTouched} />
            </div>
          </div>

          <p className="hm-helper-text mb-6">
            Access is approved manually. You&rsquo;ll be notified by email once your account is reviewed.
          </p>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Creating account…' : 'Create Account →'}
          </Button>
        </form>

        <div className="hm-divider mb-4">
          <div className="hm-divider-line" />
          <span className="hm-divider-label">or</span>
          <div className="hm-divider-line" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={handleGoogleSignup}
          className="w-full mb-7"
        >
          Continue with Google
        </Button>

        <p className="hm-text-muted text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="hm-link font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/signup/page.tsx
git commit -m "feat(auth): add real-time password strength checklist to signup"
```

---

## Task 4: Create forgot-password page

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Always show success — never reveal whether the email exists
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="auth-page-shell">
        <div className="animate-fade-up auth-card text-center">
          <p className="eyebrow mb-3">Check your email</p>
          <h1 className="display-lg hm-text mb-5">
            Link <span className="hm-accent italic">sent.</span>
          </h1>
          <p className="hm-text-muted mb-8">
            If <strong className="hm-text">{email}</strong> has an account, you&rsquo;ll
            receive a password reset link shortly.
          </p>
          <Link href="/login" className="hm-link text-sm">
            Back to sign in →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page-shell">
      <div className="animate-fade-up auth-card">
        <p className="eyebrow mb-3">Account</p>

        <h1 className="display-lg hm-text mb-8">
          Forgot <span className="hm-accent italic">Password.</span>
        </h1>

        {error && (
          <div className="hm-error-banner mb-5" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-6">
            <label className="hm-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-required="true"
              className="hm-input"
            />
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Sending…' : 'Send Reset Link →'}
          </Button>
        </form>

        <p className="hm-text-muted text-center text-sm">
          Remembered it?{' '}
          <Link href="/login" className="hm-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx
git commit -m "feat(auth): add forgot-password page"
```

---

## Task 5: Create reset-password page

**Files:**
- Create: `src/app/(auth)/reset-password/page.tsx`

The `/callback` route already calls `exchangeCodeForSession` before redirecting here, so the user has an active session on this page. We just need to call `updateUser` with the new password.

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordStrengthChecklist } from '@/components/ui/PasswordStrengthChecklist'

export default function ResetPasswordPage() {
  const [password,        setPassword]        = useState('')
  const [confirm,         setConfirm]         = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmError,    setConfirmError]    = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmError('')
    setError('')

    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?reset=success')
  }

  return (
    <div className="auth-page-shell">
      <div className="animate-fade-up auth-card">
        <p className="eyebrow mb-3">Account</p>

        <h1 className="display-lg hm-text mb-8">
          New <span className="hm-accent italic">Password.</span>
        </h1>

        {error && (
          <div className="hm-error-banner mb-5" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-2">
            <label className="hm-label" htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="Minimum 8 characters"
              required
              aria-required="true"
              aria-describedby="password-checklist"
              className="hm-input"
            />
            <div id="password-checklist">
              <PasswordStrengthChecklist password={password} touched={passwordTouched} />
            </div>
          </div>

          <div className="mb-6">
            <label className="hm-label" htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              aria-required="true"
              aria-describedby={confirmError ? 'confirm-error' : undefined}
              className="hm-input"
            />
            {confirmError && (
              <p id="confirm-error" className="hm-field-error">
                {confirmError}
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Updating…' : 'Update Password →'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/reset-password/page.tsx
git commit -m "feat(auth): add reset-password page"
```

---

## Task 6: Update login page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

Changes: add forgot password link, handle `?reset=success` banner, replace inline styles with Tailwind, add `role="alert"` to error banner. The `useSearchParams` hook requires wrapping in Suspense — extract the form to `LoginContent` and wrap it.

- [ ] **Step 1: Replace the full file content**

```tsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

function LoginContent() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const router       = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="animate-fade-up auth-card">
        <p className="eyebrow mb-3">Welcome back</p>

        <h1 className="display-lg hm-text mb-8">
          Sign <span className="hm-accent italic">In.</span>
        </h1>

        {resetSuccess && (
          <div className="hm-success-banner mb-5">
            Password updated. Sign in with your new password.
          </div>
        )}

        {error && (
          <div className="hm-error-banner mb-5" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="mb-4">
          <div className="mb-4">
            <label className="hm-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-required="true"
              className="hm-input"
            />
          </div>

          <div className="mb-6">
            <label className="hm-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              aria-required="true"
              className="hm-input"
            />
            <Link href="/forgot-password" className="hm-forgot-link">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Signing In…' : 'Sign In →'}
          </Button>
        </form>

        <div className="hm-divider mb-4">
          <div className="hm-divider-line" />
          <span className="hm-divider-label">or</span>
          <div className="hm-divider-line" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full mb-7"
        >
          Continue with Google
        </Button>

        <p className="hm-text-muted text-center text-sm">
          No account?{' '}
          <Link href="/signup" className="hm-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): add forgot password link and reset success banner to login"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: successful build, no TypeScript or compilation errors.

- [ ] **Step 3: Manual browser test — signup flow**

Start dev server: `npm run dev`

1. Go to `/signup`
2. Click into the password field and type a single character — verify the checklist appears and the "At least 8 characters" item stays neutral (not red) until blur
3. Blur the password field — verify unmet requirements turn red
4. Type a password meeting all 5 requirements — verify all items turn accent colour with checkmarks
5. Complete signup — verify the static password hint text is gone

- [ ] **Step 4: Manual browser test — password reset flow**

1. Go to `/login` — verify "Forgot password?" appears right-aligned below the password field
2. Click it — verify you reach `/forgot-password`
3. Enter an email and submit — verify the in-place success state appears (check your inbox message)
4. Trigger a real reset email (use a valid account) → click the link in the email
5. Verify you land on `/reset-password` with the form showing
6. Enter mismatched passwords — verify inline field error appears
7. Enter a valid matching password — verify redirect to `/login?reset=success` with the success banner

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(auth): complete auth features — password checklist, forgot/reset password flow"
```
