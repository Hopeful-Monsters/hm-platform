'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

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
      style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 900,
        fontSize: compact ? '12px' : '14px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        background: 'none',
        border: '2px solid var(--border-2)',
        color: 'var(--text-muted)',
        padding: compact ? '5px 10px' : '6px 14px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'border-color 0.15s, color 0.15s',
        borderRadius: 0,
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--pink)'
        el.style.color = 'var(--pink)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--border-2)'
        el.style.color = 'var(--text-muted)'
      }}
    >
      <LogOut size={compact ? 12 : 14} />
      {!compact && 'Sign Out'}
    </button>
  )
}
