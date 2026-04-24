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
