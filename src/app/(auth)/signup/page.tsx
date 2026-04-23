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
          <p className="hm-text-muted mb-8">
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
