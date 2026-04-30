'use client'

import { useMemo, useState } from 'react'
import { useReport } from './ReportContext'
import { fmt2, fmtDateShort } from './format'

const PAGE_SIZE = 50

export default function TimeDetailTab() {
  const { entries, users } = useReport()
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<'All' | 'Billable' | 'Non-Billable'>('All')
  const [client,  setClient]  = useState('')
  const [member,  setMember]  = useState('')
  const [page,    setPage]    = useState(1)

  const userMap = useMemo(
    () => new Map(users.map(u => [u.id, u.fullName])),
    [users]
  )

  const clientOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) if (e.clientName) set.add(e.clientName)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [entries])

  const memberOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) {
      const name = userMap.get(e.userId)
      if (name) set.add(name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [entries, userMap])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return entries.filter(e => {
      if (filter === 'Billable'     && e.jobIsBillable !== true)  return false
      if (filter === 'Non-Billable' && e.jobIsBillable !== false) return false
      if (client && e.clientName !== client) return false
      if (member && (userMap.get(e.userId) ?? '') !== member) return false
      if (!q) return true
      return (
        (userMap.get(e.userId) ?? '').toLowerCase().includes(q) ||
        e.jobName.toLowerCase().includes(q) ||
        e.jobNumber.toLowerCase().includes(q) ||
        e.clientName.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.itemName.toLowerCase().includes(q)
      )
    })
  }, [entries, filter, client, member, search, userMap])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const slice      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from       = Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)
  const to         = Math.min(page * PAGE_SIZE, filtered.length)

  function handleFilter(f: typeof filter) { setFilter(f); setPage(1) }
  function handleSearch(v: string)        { setSearch(v); setPage(1) }
  function handleClient(v: string)        { setClient(v); setPage(1) }
  function handleMember(v: string)        { setMember(v); setPage(1) }

  if (!entries.length) {
    return <div className="sr-empty"><p>Set a date range and run the report.</p></div>
  }

  return (
    <div className="sr-tab-panel">
      <div className="sr-controls">
        <input
          className="sr-search"
          placeholder="Search description, item, notes…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          aria-label="Search time entries"
        />
        <select
          className="sr-select"
          value={client}
          onChange={e => handleClient(e.target.value)}
          aria-label="Filter by client"
        >
          <option value="">All clients</option>
          {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="sr-select"
          value={member}
          onChange={e => handleMember(e.target.value)}
          aria-label="Filter by team member"
        >
          <option value="">All team members</option>
          {memberOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="sr-chips">
          {(['All', 'Billable', 'Non-Billable'] as const).map(f => (
            <button
              key={f}
              className={`sr-chip ${filter === f ? 'is-active' : ''} sr-chip--${f.toLowerCase().replace('-', '')}`}
              onClick={() => handleFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th className="sr-th">JOB #</th>
              <th className="sr-th">JOB NAME</th>
              <th className="sr-th">ITEM</th>
              <th className="sr-th">CLIENT</th>
              <th className="sr-th">TEAM MEMBER</th>
              <th className="sr-th">DESCRIPTION</th>
              <th className="sr-th">DATE</th>
              <th className="sr-th sr-th--right">HRS</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(e => (
              <tr key={e.id} className="sr-tr">
                <td className="sr-td sr-td--id">{e.jobNumber}</td>
                <td className="sr-td sr-td--name sr-td--truncate" title={e.jobName}>{e.jobName}</td>
                <td className="sr-td">{e.itemName}</td>
                <td className="sr-td">{e.clientName}</td>
                <td className="sr-td sr-td--name sr-td--sm">
                  {userMap.get(e.userId) ?? String(e.userId)}
                </td>
                <td className="sr-td sr-td--truncate sr-td--muted" title={e.notes}>{e.notes || '—'}</td>
                <td className="sr-td sr-td--mono">{fmtDateShort(e.date)}</td>
                <td className="sr-td sr-td--mono sr-td--right">{fmt2(e.minutes / 60)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="sr-pagination">
            <span>{from}–{to} of {filtered.length}</span>
            <div className="sr-page-btns">
              <button className="sr-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
              <button className="sr-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
