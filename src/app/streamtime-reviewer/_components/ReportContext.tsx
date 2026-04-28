'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type {
  EnrichedUser, NormalizedEntry, UserSummaryRow, JobBreakdownRow,
  FetchStatuses, FetchState, SavedReport,
} from './types'

// ── Computation helpers ───────────────────────────────────────────────────────

function calcCapacity(user: EnrichedUser, from: string, to: string): number {
  const dayHours = [
    user.hoursWorkedSunday,    user.hoursWorkedMonday,
    user.hoursWorkedTuesday,   user.hoursWorkedWednesday,
    user.hoursWorkedThursday,  user.hoursWorkedFriday,
    user.hoursWorkedSaturday,
  ]
  let total = 0
  const end = new Date(to + 'T00:00:00')
  for (let d = new Date(from + 'T00:00:00'); d <= end; d.setDate(d.getDate() + 1)) {
    total += dayHours[d.getDay()]
  }
  return total
}

function buildSummaryRows(
  users: EnrichedUser[],
  entries: NormalizedEntry[],
  oooPhrase: string,
  from: string,
  to: string,
): UserSummaryRow[] {
  const byUser = new Map<number, { billable: number; nonBillable: number; ooo: number }>()

  for (const e of entries) {
    if (!byUser.has(e.userId)) byUser.set(e.userId, { billable: 0, nonBillable: 0, ooo: 0 })
    const acc = byUser.get(e.userId)!
    const hrs = e.minutes / 60
    const isOoo = e.jobName.toLowerCase().includes(oooPhrase.toLowerCase())
    if (isOoo) {
      acc.ooo         += hrs
      acc.nonBillable += hrs
    } else if (e.jobIsBillable === true) {
      acc.billable += hrs
    } else {
      acc.nonBillable += hrs
    }
  }

  const rows: UserSummaryRow[] = []
  for (const [userId, acc] of byUser) {
    const user = users.find(u => u.id === userId)
    if (!user) continue
    const totalHours   = acc.billable + acc.nonBillable
    const workingHours = totalHours - acc.ooo
    const billablePct  = workingHours > 0 ? acc.billable / workingHours : 0
    const targetPct    = user.targetPct
    const diffPct      = targetPct !== null ? billablePct * 100 - targetPct : null
    rows.push({
      userId,
      fullName:         user.fullName,
      team:             user.team,
      isLeadership:     user.isLeadership,
      capacityHours:    calcCapacity(user, from, to),
      billableHours:    acc.billable,
      nonBillableHours: acc.nonBillable - acc.ooo,
      oooHours:         acc.ooo,
      totalHours,
      workingHours,
      billablePct,
      targetPct,
      diffPct,
    })
  }
  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

function buildJobBreakdown(entries: NormalizedEntry[]): JobBreakdownRow[] {
  const byJob = new Map<string, JobBreakdownRow>()
  for (const e of entries) {
    if (!byJob.has(e.jobId)) {
      byJob.set(e.jobId, {
        jobId: e.jobId, jobNumber: e.jobNumber, jobName: e.jobName,
        clientName: e.clientName, jobIsBillable: e.jobIsBillable,
        billableHours: 0, nonBillableHours: 0, totalHours: 0, cost: 0, sell: 0,
      })
    }
    const row = byJob.get(e.jobId)!
    const hrs = e.minutes / 60
    if (e.jobIsBillable === true) row.billableHours    += hrs
    else                          row.nonBillableHours += hrs
    row.totalHours += hrs
    row.cost       += e.cost
    row.sell       += e.totalExTax
  }
  return Array.from(byJob.values()).sort((a, b) => b.totalHours - a.totalHours)
}

// ── Context ───────────────────────────────────────────────────────────────────

type ActiveTab = 'summary' | 'timedetail' | 'jobbreakdown' | 'history'

interface ReportContextValue {
  fetchStatuses: FetchStatuses
  users: EnrichedUser[]
  entries: NormalizedEntry[]
  oooPhrase: string
  period: { from: string; to: string } | null
  activeTab: ActiveTab
  excludeLeadership: boolean
  savedReports: SavedReport[]
  isSaving: boolean
  summaryRows: UserSummaryRow[]
  jobBreakdown: JobBreakdownRow[]
  runReport: (from: string, to: string) => Promise<void>
  saveReport: () => Promise<void>
  setActiveTab: (tab: ActiveTab) => void
  toggleExcludeLeadership: () => void
  loadSavedReports: () => Promise<void>
}

const ReportContext = createContext<ReportContextValue | null>(null)

export function useReport() {
  const ctx = useContext(ReportContext)
  if (!ctx) throw new Error('useReport must be used inside ReportProvider')
  return ctx
}

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [fetchStatuses, setFetchStatuses] = useState<FetchStatuses>(
    { users: 'idle', entries: 'idle', settings: 'idle' }
  )
  const [users,       setUsers]       = useState<EnrichedUser[]>([])
  const [entries,     setEntries]     = useState<NormalizedEntry[]>([])
  const [oooPhrase,   setOooPhrase]   = useState('out of office')
  const [period,      setPeriod]      = useState<{ from: string; to: string } | null>(null)
  const [activeTab,   setActiveTab]   = useState<ActiveTab>('summary')
  const [excludeLeadership, setExcludeLeadership] = useState(false)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [isSaving,    setIsSaving]    = useState(false)

  const setStatus = (key: keyof FetchStatuses, val: FetchState) =>
    setFetchStatuses(prev => ({ ...prev, [key]: val }))

  const runReport = useCallback(async (from: string, to: string) => {
    setPeriod({ from, to })
    setFetchStatuses({ users: 'loading', entries: 'loading', settings: 'loading' })

    const [usersRes, entriesRes, settingsRes] = await Promise.allSettled([
      fetch('/api/streamtime/users').then(r => r.json()),
      fetch('/api/streamtime/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom: from, dateTo: to }),
      }).then(r => r.json()),
      fetch('/api/streamtime/settings/ooo-phrase').then(r => r.json()),
    ])

    if (usersRes.status === 'fulfilled' && !usersRes.value.error) {
      setUsers(usersRes.value.users ?? [])
      setStatus('users', 'done')
    } else { setStatus('users', 'error') }

    if (entriesRes.status === 'fulfilled' && !entriesRes.value.error) {
      setEntries(entriesRes.value.entries ?? [])
      setStatus('entries', 'done')
    } else { setStatus('entries', 'error') }

    if (settingsRes.status === 'fulfilled' && !settingsRes.value.error) {
      setOooPhrase(settingsRes.value.oooPhrase ?? 'out of office')
      setStatus('settings', 'done')
    } else { setStatus('settings', 'error') }
  }, [])

  const saveReport = useCallback(async () => {
    if (!period) return
    setIsSaving(true)
    try {
      const rows = buildSummaryRows(users, entries, oooPhrase, period.from, period.to)
      await fetch('/api/streamtime/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: period.from, dateTo: period.to, entryCount: entries.length,
          userStats: rows.map(r => ({
            streamtimeUserId: String(r.userId), displayName: r.fullName,
            team: r.team, isLeadership: r.isLeadership,
            capacityHours: r.capacityHours, billableHours: r.billableHours,
            nonBillableHours: r.nonBillableHours, oooHours: r.oooHours,
            totalHours: r.totalHours, workingHours: r.workingHours,
            billablePct: r.billablePct, targetPct: r.targetPct, diffPct: r.diffPct,
          })),
        }),
      })
    } finally { setIsSaving(false) }
  }, [period, users, entries, oooPhrase])

  const loadSavedReports = useCallback(async () => {
    const r = await fetch('/api/streamtime/reports')
    const d = await r.json()
    setSavedReports(d.reports ?? [])
  }, [])

  const summaryRows = useMemo(
    () => period ? buildSummaryRows(users, entries, oooPhrase, period.from, period.to) : [],
    [users, entries, oooPhrase, period]
  )
  const jobBreakdown = useMemo(() => buildJobBreakdown(entries), [entries])

  return (
    <ReportContext.Provider value={{
      fetchStatuses, users, entries, oooPhrase, period,
      activeTab, excludeLeadership, savedReports, isSaving,
      summaryRows, jobBreakdown,
      runReport, saveReport, setActiveTab,
      toggleExcludeLeadership: useCallback(() => setExcludeLeadership(p => !p), []),
      loadSavedReports,
    }}>
      {children}
    </ReportContext.Provider>
  )
}
