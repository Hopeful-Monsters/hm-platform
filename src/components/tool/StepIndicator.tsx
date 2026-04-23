'use client'

import { useWizard } from './WizardContext'
import type { WizardStep } from './WizardContext'
import { cn } from '@/lib/utils'

interface Props {
  steps: readonly string[]
}

export default function StepIndicator({ steps }: Props) {
  const { step } = useWizard()

  return (
    <div className="wizard-steps" role="list" aria-label="Progress">
      {steps.map((label, i) => {
        const n = (i + 1) as WizardStep
        const isDone   = step > n
        const isActive = step === n
        return (
          <div key={label} className="wizard-step-row" role="listitem">
            <div
              className={cn(
                'wizard-step',
                isDone   && 'is-done',
                isActive && 'is-active'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="wizard-step-num" aria-hidden>{isDone ? '✓' : n}</span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className="wizard-step-connector" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
  )
}
