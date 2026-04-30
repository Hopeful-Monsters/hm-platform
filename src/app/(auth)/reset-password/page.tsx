'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordStrengthChecklist } from '@/components/ui/PasswordStrengthChecklist'
import AuthShell from '../_components/AuthShell'

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
    <AuthShell
      eyebrow="Account"
      title={<>New <span className="hm-accent italic">Password.</span></>}
      error={error}
    >
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
    </AuthShell>
  )
}
