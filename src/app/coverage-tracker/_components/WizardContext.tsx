'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

/**
 * Wizard steps for the Coverage Tracker flow.
 *
 *   1 Upload   — drop Meltwater CSV
 *   2 Setup    — campaign / key messages / spokespersons / CTAs + destination config
 *   3 Review   — per-row edits; confirmation modal triggers submit from here
 *   4 Result   — success / failure outcome (not a user-navigable step; shown after submit)
 *
 * The sub-nav step indicator shows steps 1–3 only; step 4 is the
 * post-submit outcome screen.
 */
export type WizardStep = 1 | 2 | 3 | 4

interface WizardContextValue {
  step: WizardStep
  setStep: (s: WizardStep) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1)
  return (
    <WizardContext.Provider value={{ step, setStep }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>')
  return ctx
}
