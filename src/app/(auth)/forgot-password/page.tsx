'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import AuthShell from '../_components/AuthShell'

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
      <AuthShell
        variant="centered"
        eyebrow="Check your email"
        title={<>Link <span className="hm-accent italic">sent.</span></>}
      >
        <p className="hm-text-muted mb-8">
          If <strong className="hm-text">{email}</strong> has an account, you&rsquo;ll
          receive a password reset link shortly.
        </p>
        <Link href="/login" className="hm-link text-sm">
          Back to sign in →
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Account"
      title={<>Forgot <span className="hm-accent italic">Password.</span></>}
      error={error}
    >
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
    </AuthShell>
  )
}
