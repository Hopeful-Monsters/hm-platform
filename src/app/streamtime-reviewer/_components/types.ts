// src/app/streamtime-reviewer/_components/types.ts

export type Team = 'Creative' | 'Execution' | 'Strategy' | 'Support'

export type FetchState = 'idle' | 'loading' | 'done' | 'error'

export interface FetchStatuses {
  users: FetchState
  entries: FetchState
  settings: FetchState
}

/** Streamtime user enriched with team, leadership flag, and Supabase target */
export interface EnrichedUser {
  id: number
  fullName: string
  labels: string[]
  team: Team
  isLeadership: boolean
  targetPct: number | null
  hoursWorkedSunday: number
  hoursWorkedMonday: number
  hoursWorkedTuesday: number
  hoursWorkedWednesday: number
  hoursWorkedThursday: number
  hoursWorkedFriday: number
  hoursWorkedSaturday: number
}

/** Normalised time entry (raw Streamtime shape flattened) */
export interface NormalizedEntry {
  id: string
  userId: number
  date: string
  minutes: number
  jobId: string
  jobNumber: string
  jobName: string
  jobIsBillable: boolean | null
  jobLabelName: string
  itemName: string
  clientName: string
  notes: string
  statusName: string
  cost: number
  totalExTax: number
}

/** Computed summary row for one team member */
export interface UserSummaryRow {
  userId: number
  fullName: string
  team: Team
  isLeadership: boolean
  capacityHours: number
  billableHours: number
  /** Non-billable hours excluding OOO */
  nonBillableHours: number
  oooHours: number
  /** billableHours + nonBillableHours + oooHours */
  totalHours: number
  /** totalHours - oooHours */
  workingHours: number
  /** billableHours / workingHours (0–1 fraction) */
  billablePct: number
  /** 0–100 value from Supabase targets */
  targetPct: number | null
  /** (billablePct * 100) - targetPct */
  diffPct: number | null
}

/** Computed row for one job across all entries */
export interface JobBreakdownRow {
  jobId: string
  jobNumber: string
  jobName: string
  clientName: string
  jobIsBillable: boolean | null
  billableHours: number
  nonBillableHours: number
  totalHours: number
  cost: number
  sell: number
}

/** Saved report metadata (list view) */
export interface SavedReport {
  id: string
  dateFrom: string
  dateTo: string
  entryCount: number
  savedAt: string
}

/** Saved report with per-user stats (detail view) */
export interface SavedReportDetail extends SavedReport {
  userStats: SavedUserStat[]
}

export interface SavedUserStat {
  streamtimeUserId: string
  displayName: string
  team: string
  isLeadership: boolean
  capacityHours: number
  billableHours: number
  nonBillableHours: number
  oooHours: number
  totalHours: number
  workingHours: number
  billablePct: number
  targetPct: number | null
  diffPct: number | null
}

/** Shape returned by GET /api/streamtime/users */
export interface UsersApiResponse {
  users: EnrichedUser[]
}

/** Shape returned by POST /api/streamtime/entries */
export interface EntriesApiResponse {
  entries: NormalizedEntry[]
}

/** Shape returned by GET /api/streamtime/settings/ooo-phrase */
export interface OooPhraseApiResponse {
  oooPhrase: string
}

/** Shape returned by GET /api/streamtime/settings/targets */
export interface TargetsApiResponse {
  targets: Array<{
    streamtimeUserId: string
    displayName: string
    targetPct: number
  }>
}
