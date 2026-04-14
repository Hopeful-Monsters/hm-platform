import { normaliseJob } from './_utils'
import { searchJobs } from './_actions'
import JobPicker from './_components/JobPicker'
import './expenses-manager.css'

// ── Job picker (server component) ────────────────────────────────
// Fetches jobs via Streamtime Server Action at request time,
// passes them to the JobPicker client component.

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
        <JobPicker jobs={jobs} error={error} />
      </main>
    </div>
  )
}
