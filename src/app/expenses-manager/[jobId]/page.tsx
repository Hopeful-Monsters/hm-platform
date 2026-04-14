import type { Job } from '../_types'
import ExpenseWizard from './_components/ExpenseWizard'
import '../expenses-manager.css'

// ── Expense wizard (server component shell) ──────────────────────
// Reconstructs the Job from URL params + search params (set by JobPicker),
// then hands off to the ExpenseWizard client component for steps 2-4.

type Props = {
  params:       Promise<{ jobId: string }>
  searchParams: Promise<{ n?: string; num?: string; c?: string; f?: string }>
}

export default async function JobExpensesPage({ params, searchParams }: Props) {
  const { jobId } = await params
  const sp        = await searchParams

  const job: Job = {
    id:     jobId,
    name:   sp.n   || jobId,
    num:    sp.num || '',
    client: sp.c   || '',
    full:   sp.f   || sp.n || jobId,
  }

  return (
    <div data-tool="expenses-manager">
      <main className="main">
        <ExpenseWizard job={job} />
      </main>
    </div>
  )
}
