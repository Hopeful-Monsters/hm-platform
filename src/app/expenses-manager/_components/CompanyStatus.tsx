'use client'

import type { CompanyState } from '../_types'

export function CompanyStatus({
  company,
  supplierName,
  onRecheck,
  onChoose,
  onCreate,
}: {
  company: CompanyState | null
  supplierName: string
  onRecheck: () => void
  onChoose: (id: string | number, name: string) => void
  onCreate: (name: string) => void
}) {
  if (!company) return null

  if (company.status === 'checking')
    return (
      <div className="co-row loading">
        <span className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} /> Checking company in Streamtime…
      </div>
    )
  if (company.status === 'matched')
    return <div className="co-row ok">✓ Matched existing supplier</div>
  if (company.status === 'created')
    return <div className="co-row ok">✓ Created new supplier: <strong style={{ marginLeft: 4 }}>{company.matchedName}</strong></div>
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
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 900, color: 'var(--accent-label)' }}>Use →</span>
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
