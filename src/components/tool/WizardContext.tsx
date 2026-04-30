'use client'

import { createContext, useContext, useMemo, useState, ReactNode } from 'react'

export type WizardStep = 1 | 2 | 3 | 4

interface WizardContextValue {
  step: WizardStep
  setStep: (s: WizardStep) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WizardStep>(1)
  const value = useMemo(() => ({ step, setStep }), [step])
  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>')
  return ctx
}
