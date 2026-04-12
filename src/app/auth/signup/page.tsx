'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

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
      fetch('/api/auth/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {})
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - var(--nav-h))',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div className="animate-fade-up" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>You&rsquo;re in the queue</p>
          <h1 className="display-lg" style={{ color: 'var(--text)', marginBottom: 20 }}>
            Check your<br />
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>inbox.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 32 }}>
            We&rsquo;ve sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Once confirmed, your account will be pending admin approval. You&rsquo;ll hear from us soon.
          </p>
          <Link
            href="/auth/login"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            Back to sign in →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--nav-h))',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div className="animate-fade-up" style={{ maxWidth: 480, width: '100%' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Request access</p>

        <h1
          className="display-lg"
          style={{ color: 'var(--text)', marginBottom: 32 }}
        >
          Sign<br />
          <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Up.</span>
        </h1>

        {error && (
          <div
            style={{
              background: '#180000',
              borderLeft: '4px solid #FF4444',
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: '#FF8888',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="hm-label" htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                required
                className="hm-input"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="hm-label" htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
                required
                className="hm-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="hm-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="hm-input"
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="hm-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              className="hm-input"
            />
          </div>

          <p
            style={{
              fontSize: 12,
              color: 'var(--text-dim)',
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            Access is approved manually. You&rsquo;ll be notified by email once your account is reviewed.
          </p>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            style={{ width: '100%' }}
          >
            {loading ? 'Creating account…' : 'Create Account →'}
          </Button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}
          >
            or
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={handleGoogleSignup}
          style={{ width: '100%', marginBottom: 28 }}
        >
          Continue with Google
        </Button>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link
            href="/auth/login"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
