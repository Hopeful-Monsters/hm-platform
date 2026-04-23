'use client'

import SharedStepIndicator from '@/components/tool/StepIndicator'

const STEPS = ['Upload CSV', 'Setup', 'Review & Submit'] as const

export default function StepIndicator() {
  return <SharedStepIndicator steps={STEPS} />
}
