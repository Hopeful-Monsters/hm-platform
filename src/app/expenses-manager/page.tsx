import { normaliseJob } from './_utils'
import { searchJobs } from './_actions'
import ExpensesManagerClient from './_components/ExpensesManagerClient'

// ── Expenses Manager page (server component) ──────────────────────
// Fetches jobs via Streamtime Server Action at request time and passes
// them to the client orchestrator. Job selection and wizard rendering
// happen entirely client-side — no navigation to /[jobId] needed.
//
// The outer `data-tool="expenses-manager"` wrapper and CSS import live
// in layout.tsx so they cover every page under this route.

export default async function ExpensesManagerPage() {
  let jobs: ReturnType<typeof normaliseJob>[] = []
  let error: string | null = null

  try {
    const data = await searchJobs()
    jobs = (data.searchResults || [])
      .map(normaliseJob)
      .filter(j => j.id && j.name)
      .filter(j => {
        const s = j.status.toLowerCase()
        return s === 'in play' || s === 'paused'
      })
    if (!jobs.length) error = 'No In Play or Paused jobs returned. Check STREAMTIME_KEY is set.'
  } catch (err: unknown) {
    error = (err as Error).message
  }

  return (
    <main className="main">
      <ExpensesManagerClient jobs={jobs} error={error} />
    </main>
  )
}
