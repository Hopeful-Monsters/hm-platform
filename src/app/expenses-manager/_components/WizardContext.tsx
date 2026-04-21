'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

/**
 * Wizard steps for the Expenses Manager flow.
 *
 *   1 Select Job      — JobPicker
 *   2 Upload Receipts — DropZone + extract
 *   3 Review & Submit — per-receipt edits + submit to Streamtime
 *   4 Success         — outcome screen (not shown in the sub-nav indicator)
 *
 * The sub-nav indicator displays steps 1–3 only; step 4 is a post-submit
 * outcome screen. When step===4, all three indicator cells render as "done".
 *
 * Mirrors the pattern used by coverage-tracker (see
 * coverage-tracker/_components/WizardContext.tsx).
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
