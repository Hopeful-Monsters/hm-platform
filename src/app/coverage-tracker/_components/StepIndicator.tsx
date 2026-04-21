'use client'

import { useWizard } from './WizardContext'

const STEPS = ['Upload CSV', 'Setup', 'Review & Submit'] as const

/**
 * Renders the 3-step wizard indicator inside the ToolHeader's tab slot.
 * Step 4 (result) is the post-submit outcome screen and doesn't appear here.
 */
export default function StepIndicator() {
  const { step } = useWizard()

  return (
    <div className="ct-steps">
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const isDone   = step > n
        const isActive = step === n
        const cls      = `ct-step${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}`
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={cls}>
              <span className="ct-step-num">{isDone ? '✓' : n}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && <div className="ct-step-connector" />}
          </div>
        )
      })}
    </div>
  )
}
