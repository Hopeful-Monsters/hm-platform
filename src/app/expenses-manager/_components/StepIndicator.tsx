'use client'

import { useWizard } from './WizardContext'

const STEPS = ['Select Job', 'Upload Receipts', 'Review & Submit'] as const

/**
 * Renders the 3-step wizard indicator inside the ToolHeader's tab slot.
 * Step 4 (success) is a post-submit outcome screen and doesn't appear here —
 * when step===4, all three cells render as "done".
 */
export default function StepIndicator() {
  const { step } = useWizard()

  return (
    <div className="em-steps">
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const isDone   = step > n
        const isActive = step === n
        const cls      = `em-step${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}`
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={cls}>
              <span className="em-step-num">{isDone ? '✓' : n}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && <div className="em-step-connector" />}
          </div>
        )
      })}
    </div>
  )
}
