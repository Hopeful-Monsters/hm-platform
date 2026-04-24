'use client'

import SharedStepIndicator from '@/components/tool/StepIndicator'

const STEPS = ['Select Job', 'Upload Receipts', 'Review & Submit'] as const

export default function StepIndicator() {
  return <SharedStepIndicator steps={STEPS} />
}
