'use client'

import { useMemo } from 'react'
import { Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Requirement {
  label: string
  test: (pw: string) => boolean
}

const REQUIREMENTS: Requirement[] = [
  { label: 'At least 8 characters',      test: pw => pw.length >= 8 },
  { label: 'Lowercase letter (a–z)',      test: pw => /[a-z]/.test(pw) },
  { label: 'Uppercase letter (A–Z)',      test: pw => /[A-Z]/.test(pw) },
  { label: 'Number (0–9)',                test: pw => /[0-9]/.test(pw) },
  { label: 'Special character',          test: pw => /[!@#$%^&*()_+\-=[\]{};':|<>?,./ ~]/.test(pw) },
]

interface Props {
  password: string
  touched: boolean
}

export function PasswordStrengthChecklist({ password, touched }: Props) {
  const results = useMemo(
    () => REQUIREMENTS.map(r => ({ label: r.label, met: r.test(password) })),
    [password]
  )

  return (
    <div className="hm-checklist" aria-live="polite" aria-label="Password requirements">
      {results.map(({ label, met }) => {
        const state = password.length === 0
          ? 'neutral'
          : met
            ? 'met'
            : touched ? 'error' : 'neutral'

        return (
          <div
            key={label}
            className={cn('hm-checklist-item', `hm-checklist-item--${state}`)}
          >
            {state === 'met'
              ? <Check className="hm-checklist-icon" aria-hidden />
              : state === 'error'
                ? <X className="hm-checklist-icon" aria-hidden />
                : <Minus className="hm-checklist-icon" aria-hidden />
            }
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
