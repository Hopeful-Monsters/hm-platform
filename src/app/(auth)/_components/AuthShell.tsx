'use client'

import type { ReactNode } from 'react'

interface Props {
  eyebrow:   string
  title:     ReactNode
  /** 'default' = form layout (mb-8 heading); 'centered' = success/info layout (centered, mb-5). */
  variant?:  'default' | 'centered'
  /** Standalone banner rendered above the error banner (e.g. login's reset-success notice). */
  banner?:   ReactNode
  error?:    string | null
  children:  ReactNode
}

/**
 * Shared layout for every auth screen — login, signup, forgot-password,
 * reset-password, and their success states. Keeps the eyebrow + heading
 * + error banner pattern in one place so future auth screens are a
 * single render call away.
 */
export default function AuthShell({
  eyebrow, title, variant = 'default', banner, error, children,
}: Props) {
  const isCentered = variant === 'centered'
  const cardClass  = `animate-fade-up auth-card${isCentered ? ' text-center' : ''}`
  const headingMb  = isCentered ? 'mb-5' : 'mb-8'

  return (
    <div className="auth-page-shell">
      <div className={cardClass}>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className={`display-lg hm-text ${headingMb}`}>{title}</h1>
        {banner}
        {error && (
          <div className="hm-error-banner mb-5" role="alert">
            {error}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
