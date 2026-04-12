'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
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
        {/* Eyebrow */}
        <p className="eyebrow" style={{ marginBottom: 12 }}>Welcome back</p>

        {/* Heading */}
        <h1
          className="display-lg"
          style={{ color: 'var(--text)', marginBottom: 32 }}
        >
          Sign<br />
          <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>In.</span>
        </h1>

        {/* Error */}
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

        {/* Email form */}
        <form onSubmit={handleEmailLogin} style={{ marginBottom: 16 }}>
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

          <div style={{ marginBottom: 24 }}>
            <label className="hm-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="hm-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            style={{ width: '100%' }}
          >
            {loading ? 'Signing In…' : 'Sign In →'}
          </Button>
        </form>

        {/* Divider */}
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

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={handleGoogleLogin}
          style={{ width: '100%', marginBottom: 28 }}
        >
          Continue with Google
        </Button>

        {/* Footer */}
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          No account?{' '}
          <Link
            href="/auth/signup"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
