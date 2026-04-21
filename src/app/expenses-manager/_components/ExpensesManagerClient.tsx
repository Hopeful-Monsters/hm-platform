'use client'

import { useState, useEffect } from 'react'
import type { Job } from '../_types'
import { getAllCompanies } from '../_actions'
import { useAppStore, companiesCacheIsValid } from '@/store/app-store'
import { useWizard } from './WizardContext'
import JobPicker from './JobPicker'
import ExpenseWizard from './ExpenseWizard'

// ── ExpensesManagerClient ─────────────────────────────────────────
// Manages job selection state so the wizard renders in-place,
// avoiding the SSR round-trip that /expenses-manager/[jobId] caused.
//
// Also prefetches companies in the background while the user is still
// on the job picker, so the wizard loads instantly with a warm cache.

export default function ExpensesManagerClient({
  jobs,
  error,
}: {
  jobs: Job[]
  error: string | null
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  // ── Sub-nav step sync ─────────────────────────────────────────
  // Step 1 = JobPicker; steps 2–4 are driven from inside ExpenseWizard via
  // useExpenses. When the user hits "← Back" (selectedJob → null) we reset
  // the sub-nav indicator to step 1. useExpenses will take over from step 2.
  const { setStep: setCtxStep } = useWizard()
  useEffect(() => {
    if (!selectedJob) setCtxStep(1)
  }, [selectedJob, setCtxStep])

  // ── Prefetch companies ────────────────────────────────────────
  const companiesLoadedAt = useAppStore(s => s.companiesLoadedAt)
  const storeSetCompanies = useAppStore(s => s.setCompanies)

  useEffect(() => {
    // Only prefetch if the store cache is cold; useExpenses will read from
    // the store on mount, so by the time the wizard appears, companies are ready.
    if (companiesCacheIsValid(companiesLoadedAt)) return
    getAllCompanies()
      .then(data => {
        if (data.companies?.length) {
          storeSetCompanies(data.companies as Array<{ id: string | number; name: string }>)
        }
      })
      .catch(() => { /* silent — useExpenses will retry on wizard mount */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedJob) {
    return <ExpenseWizard job={selectedJob} onBack={() => setSelectedJob(null)} />
  }

  return <JobPicker jobs={jobs} error={error} onSelect={setSelectedJob} />
}
