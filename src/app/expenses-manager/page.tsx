import { normaliseJob } from './_utils'
import { searchJobs } from './_actions'
import ExpensesManagerClient from './_components/ExpensesManagerClient'
import './expenses-manager.css'

// ── Expenses Manager page (server component) ──────────────────────
// Fetches jobs via Streamtime Server Action at request time and passes
// them to the client orchestrator. Job selection and wizard rendering
// happen entirely client-side — no navigation to /[jobId] needed.

export default async function ExpensesManagerPage() {
  let jobs: ReturnType<typeof normaliseJob>[] = []
  let error: string | null = null

  try {
    const data = await searchJobs()
    jobs = (data.searchResults || [])
      .map(normaliseJob)
      .filter(j => j.id && j.name)
    if (!jobs.length) error = 'No jobs returned. Check STREAMTIME_KEY is set.'
  } catch (err: unknown) {
    error = (err as Error).message
  }

  return (
    <div data-tool="expenses-manager">
      <main className="main">
        <ExpensesManagerClient jobs={jobs} error={error} />
      </main>
    </div>
  )
}
