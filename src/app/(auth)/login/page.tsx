'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import AuthShell from '../_components/AuthShell'
import { signInWithGoogle } from '@/lib/auth/oauth'

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
    const { error } = await signInWithGoogle(supabase)
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Sign <span className="hm-accent italic">In.</span></>}
      banner={resetSuccess && (
        <div className="hm-success-banner mb-5">
          Password updated. Sign in with your new password.
        </div>
      )}
      error={error}
    >
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
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
