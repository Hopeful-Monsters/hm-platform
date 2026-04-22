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
        {/* Eyebrow */}
        <p className="eyebrow" style={{ marginBottom: 12 }}>Welcome back</p>

        {/* Heading */}
        <h1 className="display-lg hm-text" style={{ marginBottom: 32 }}>
          Sign <span className="hm-accent italic">In.</span>
        </h1>

        {/* Error */}
        {error && (
          <div className="hm-error-banner" style={{ marginBottom: 20 }}>
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

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Signing In…' : 'Sign In →'}
          </Button>
        </form>

        {/* Divider */}
        <div className="hm-divider" style={{ marginBottom: 16 }}>
          <div className="hm-divider-line" />
          <span className="hm-divider-label">or</span>
          <div className="hm-divider-line" />
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full"
          style={{ marginBottom: 28 }}
        >
          Continue with Google
        </Button>

        {/* Footer */}
        <p className="hm-text-muted text-center" style={{ fontSize: 13 }}>
          No account?{' '}
          <Link href="/signup" className="hm-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
