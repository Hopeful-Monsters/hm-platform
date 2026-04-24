'use client'

import type { CompanyState } from '../_types'

export function CompanyStatus({
  company,
  supplierName,
  hasError,
  onRecheck,
  onChoose,
  onCreate,
}: {
  company: CompanyState | null
  supplierName: string
  hasError?: boolean
  onRecheck: () => void
  onChoose: (id: string | number, name: string) => void
  onCreate: (name: string) => void
}) {
  if (!company) {
    // Show a prompt if validation fired but no check has run yet
    if (hasError) return (
      <div className="co-row warn">⚠ Supplier not yet verified in Streamtime</div>
    )
    return null
  }

  if (company.status === 'checking')
    return (
      <div className="co-row loading">
        <span className="spin spin-xs" /> Checking company in Streamtime…
      </div>
    )
  if (company.status === 'matched')
    return <div className="co-row ok">✓ Matched existing supplier</div>
  if (company.status === 'created')
    return <div className="co-row ok">✓ Created new supplier: <strong className="ml-1">{company.matchedName}</strong></div>
  if (company.status === 'error')
    return <div className="co-row warn">Company check failed: {company.errorMsg || 'unknown error'}</div>
  if (company.status === 'notfound')
    return (
      <div className="co-block">
        <div className="co-row warn">⚠ <strong>{supplierName}</strong> not found in Streamtime</div>
        <div className="co-actions">
          <button className="btn btn-warning btn-sm" onClick={() => onCreate(supplierName)}>✚ Create company</button>
          <button className="btn btn-secondary btn-sm" onClick={onRecheck}>↺ Re-check</button>
        </div>
      </div>
    )
  if (company.status === 'similar')
    return (
      <div className="co-block">
        <div className="co-row warn">⚠ No exact match for <strong>{supplierName}</strong>. Select a match or create:</div>
        <div className="co-similar-list">
          {company.similar.map(r => (
            <div key={r.id} className="co-similar-item" onClick={() => onChoose(r.id, String(r.name))}>
              <span className="co-similar-name">{r.name}</span>
              <span className="co-similar-use">Use →</span>
            </div>
          ))}
        </div>
        <div className="co-actions">
          <button className="btn btn-warning btn-sm" onClick={() => onCreate(supplierName)}>✚ Create &ldquo;{supplierName}&rdquo;</button>
          <button className="btn btn-secondary btn-sm" onClick={onRecheck}>↺ Re-check</button>
        </div>
      </div>
    )
  return null
}
