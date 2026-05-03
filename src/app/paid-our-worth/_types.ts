// src/app/paid-our-worth/_types.ts

export type TabId = 'current' | 'history' | 'config'

export type NoteColumn = 'marti_response' | 'response'

/** Row uploaded via CSV — one job per period_month */
export interface RevenueEntry {
  id: string
  periodMonth: string         // ISO date (first of month)
  jobId: string
  jobName: string
  revenueAmount: number
  displayOrder: number
}

/** Computed billable row for current view */
export interface BillableRow {
  jobId: string
  jobName: string
  currentTime: number         // sum totalExTax
  revenue: number
  timeLeft: number            // revenue - currentTime
  notes: Partial<Record<NoteColumn, string>>
}

/** Computed non-billable row for current view */
export interface NonBillableRow {
  jobId: string
  jobName: string
  currentTime: number
  pctOfTotal: number          // 0–1
  notes: Partial<Record<NoteColumn, string>>
}

export interface SnapshotTotals {
  totalBillable: number
  totalNonBillable: number
  totalRevenue: number
  reportTotal: number
  variance: number
  workingDaysInMonth: number
  daysWorked: number
  cutoffDate: string
}

export interface SavedSnapshot {
  id: string
  periodMonth: string
  cutoffDate: string
  workingDaysInMonth: number
  daysWorked: number
  totalBillableTime: number
  totalNonBillableTime: number
  totalRevenue: number
  reportTotal: number
  variance: number
  createdAt: string
}

export interface SavedSnapshotDetail extends SavedSnapshot {
  billable: BillableRow[]
  nonBillable: NonBillableRow[]
}

export interface NoteRecord {
  jobId: string
  columnKey: NoteColumn
  body: string
  updatedAt: string
}
