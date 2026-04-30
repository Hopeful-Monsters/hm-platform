import type { Status } from '@/lib/coverage-tracker/types'

export default function StatusBanner({ status }: { status: Status }) {
  if (!status) return null
  return (
    <div
      className={`ct-banner ${status.type}`}
      // Message may include a safe anchor tag for sheet links
      dangerouslySetInnerHTML={{ __html: status.message }}
    />
  )
}
