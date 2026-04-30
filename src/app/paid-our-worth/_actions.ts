'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminAccess, requireToolAccess } from '@/lib/auth'
import { rateLimits } from '@/lib/upstash/ratelimit'
import { parseRevenueCsv, type ParsedRevenueRow } from './_lib/parseRevenueCsv'
import type {
  BillableRow,
  NoteColumn,
  NonBillableRow,
  NoteRecord,
  RevenueEntry,
  SavedSnapshot,
  SavedSnapshotDetail,
} from './_types'

const ORG_ID = 'default'

async function checkRateLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean }> },
  key: string,
) {
  const { success } = await limiter.limit(key)
  if (!success) throw new Error('Too many requests. Please try again shortly.')
}

function isoFirstOfMonth(periodMonth: string): string {
  // Accept 'YYYY-MM' or 'YYYY-MM-DD'. Return 'YYYY-MM-01'.
  const m = periodMonth.match(/^(\d{4})-(\d{2})/)
  if (!m) throw new Error(`Invalid period_month: "${periodMonth}"`)
  return `${m[1]}-${m[2]}-01`
}

function rowToEntry(r: {
  id: string
  period_month: string
  job_id: string
  job_name: string
  revenue_amount: number
  display_order: number
}): RevenueEntry {
  return {
    id:            r.id,
    periodMonth:   r.period_month,
    jobId:         r.job_id,
    jobName:       r.job_name,
    revenueAmount: Number(r.revenue_amount),
    displayOrder:  r.display_order,
  }
}

/** Read all revenue rows for a given month. Any approved tool user. */
export async function listRevenueByMonth(periodMonth: string): Promise<{ entries: RevenueEntry[] }> {
  const user = await requireToolAccess('paid-our-worth')
  await checkRateLimit(rateLimits.api, `paid-our-worth:revenue-list:${user.id}`)

  const month = isoFirstOfMonth(periodMonth)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('paid_our_worth_revenue')
    .select('id, period_month, job_id, job_name, revenue_amount, display_order')
    .eq('org_id', ORG_ID)
    .eq('period_month', month)
    .order('display_order', { ascending: true })
    .order('job_id', { ascending: true })

  if (error) throw error
  return { entries: (data ?? []).map(rowToEntry) }
}

/**
 * Replace all revenue rows for a given month from a parsed CSV payload.
 * Admin-only. Wipes existing rows for the month, inserts new ones.
 */
export async function replaceRevenueForMonth(
  periodMonth: string,
  csvText: string,
): Promise<{ inserted: number; replaced: number }> {
  const user = await requireAdminAccess()
  await checkRateLimit(rateLimits.api, `paid-our-worth:revenue-replace:${user.id}`)

  const month = isoFirstOfMonth(periodMonth)
  const { rows, errors } = parseRevenueCsv(csvText)
  if (errors.length) throw new Error(errors.join('\n'))
  if (!rows.length) throw new Error('CSV contained no valid rows.')

  const supabase = createServiceClient()
  const { count: replaced } = await supabase
    .from('paid_our_worth_revenue')
    .delete({ count: 'exact' })
    .eq('org_id', ORG_ID)
    .eq('period_month', month)

  const { error: insertErr } = await supabase
    .from('paid_our_worth_revenue')
    .insert(rows.map((r: ParsedRevenueRow, idx) => ({
      org_id:         ORG_ID,
      period_month:   month,
      job_id:         r.jobId,
      job_name:       r.jobName,
      revenue_amount: r.revenueAmount,
      display_order:  idx,
      created_by:     user.id,
    })))
  if (insertErr) throw insertErr

  return { inserted: rows.length, replaced: replaced ?? 0 }
}

/** Update a single revenue row in place. Admin-only. */
export async function updateRevenueRow(
  id: string,
  patch: { jobName?: string; revenueAmount?: number },
): Promise<void> {
  const user = await requireAdminAccess()
  await checkRateLimit(rateLimits.api, `paid-our-worth:revenue-update:${user.id}`)

  const update: { job_name?: string; revenue_amount?: number } = {}
  if (patch.jobName !== undefined)        update.job_name       = patch.jobName
  if (patch.revenueAmount !== undefined)  update.revenue_amount = patch.revenueAmount
  if (Object.keys(update).length === 0) return

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('paid_our_worth_revenue')
    .update(update)
    .eq('id', id)
  if (error) throw error
}

// ── Notes ─────────────────────────────────────────────────────────────────────

const VALID_NOTE_COLUMNS: NoteColumn[] = ['marti_response', 'response']

/** List all notes for a given month, across every job. Any approved tool user. */
export async function listNotesByMonth(periodMonth: string): Promise<{ notes: NoteRecord[] }> {
  const user = await requireToolAccess('paid-our-worth')
  await checkRateLimit(rateLimits.api, `paid-our-worth:notes-list:${user.id}`)

  const month = isoFirstOfMonth(periodMonth)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('paid_our_worth_note')
    .select('job_id, column_key, body, updated_at')
    .eq('org_id', ORG_ID)
    .eq('period_month', month)
  if (error) throw error

  const notes: NoteRecord[] = (data ?? [])
    .filter(r => VALID_NOTE_COLUMNS.includes(r.column_key as NoteColumn))
    .map(r => ({
      jobId:     r.job_id,
      columnKey: r.column_key as NoteColumn,
      body:      r.body,
      updatedAt: r.updated_at ?? '',
    }))

  return { notes }
}

/**
 * Upsert a single note. Empty `body` deletes the row (no need to keep a
 * blank record around). Any approved tool user can edit.
 */
export async function upsertNote(
  periodMonth: string,
  jobId: string,
  columnKey: NoteColumn,
  body: string,
): Promise<void> {
  const user = await requireToolAccess('paid-our-worth')
  await checkRateLimit(rateLimits.api, `paid-our-worth:note-upsert:${user.id}`)

  if (!VALID_NOTE_COLUMNS.includes(columnKey)) throw new Error(`Invalid column_key: ${columnKey}`)
  if (!jobId) throw new Error('jobId is required')

  const month = isoFirstOfMonth(periodMonth)
  const supabase = createServiceClient()
  const trimmed = body.trim()

  if (trimmed === '') {
    const { error } = await supabase
      .from('paid_our_worth_note')
      .delete()
      .eq('org_id', ORG_ID)
      .eq('period_month', month)
      .eq('job_id', jobId)
      .eq('column_key', columnKey)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('paid_our_worth_note')
    .upsert(
      {
        org_id:       ORG_ID,
        period_month: month,
        job_id:       jobId,
        column_key:   columnKey,
        body:         trimmed,
        author_id:    user.id,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'org_id,period_month,job_id,column_key' },
    )
  if (error) throw error
}

// ── Snapshots ────────────────────────────────────────────────────────────────

interface SnapshotInput {
  periodMonth:         string
  cutoffDate:          string
  workingDaysInMonth:  number
  daysWorked:          number
  reportTotal:         number
  billable:            Array<{
    jobId:       string
    jobName:     string
    currentTime: number
    revenue:     number
    timeLeft:    number
  }>
  nonBillable: Array<{
    jobId:       string
    jobName:     string
    currentTime: number
    pctOfTotal:  number
  }>
}

/**
 * Persist the current view as a weekly snapshot. Replaces any existing
 * snapshot for the same cutoff_date. Admin-only.
 */
export async function saveSnapshot(input: SnapshotInput): Promise<{ id: string }> {
  const user = await requireAdminAccess()
  await checkRateLimit(rateLimits.api, `paid-our-worth:snapshot-save:${user.id}`)

  const month = isoFirstOfMonth(input.periodMonth)
  const supabase = createServiceClient()

  const totalBillable    = input.billable.reduce((s, r) => s + r.currentTime, 0)
  const totalNonBillable = input.nonBillable.reduce((s, r) => s + r.currentTime, 0)
  const totalRevenue     = input.billable.reduce((s, r) => s + r.revenue, 0)
  const variance         = (totalBillable + totalNonBillable) - input.reportTotal

  const { data: snap, error: snapErr } = await supabase
    .from('paid_our_worth_snapshot')
    .upsert(
      {
        org_id:                  ORG_ID,
        period_month:            month,
        cutoff_date:             input.cutoffDate,
        working_days_in_month:   input.workingDaysInMonth,
        days_worked:             input.daysWorked,
        total_billable_time:     totalBillable,
        total_non_billable_time: totalNonBillable,
        total_revenue:           totalRevenue,
        report_total:            input.reportTotal,
        variance,
        created_by:              user.id,
        created_at:              new Date().toISOString(),
      },
      { onConflict: 'org_id,cutoff_date' },
    )
    .select('id')
    .single()
  if (snapErr) throw snapErr

  await supabase.from('paid_our_worth_snapshot_row').delete().eq('snapshot_id', snap.id)

  const rows: Array<{
    snapshot_id:         string
    job_id:              string
    job_name:            string
    is_billable:         boolean
    current_time_amount: number
    revenue_amount:      number | null
    time_left:           number | null
    pct_of_total:        number | null
    display_order:       number
  }> = []
  input.billable.forEach((r, idx) => {
    rows.push({
      snapshot_id:         snap.id,
      job_id:              r.jobId,
      job_name:             r.jobName,
      is_billable:         true,
      current_time_amount: r.currentTime,
      revenue_amount:      r.revenue,
      time_left:           r.timeLeft,
      pct_of_total:        null,
      display_order:       idx,
    })
  })
  input.nonBillable.forEach((r, idx) => {
    rows.push({
      snapshot_id:         snap.id,
      job_id:              r.jobId,
      job_name:            r.jobName,
      is_billable:         false,
      current_time_amount: r.currentTime,
      revenue_amount:      null,
      time_left:           null,
      pct_of_total:        r.pctOfTotal,
      display_order:       input.billable.length + idx,
    })
  })

  if (rows.length > 0) {
    const { error: rowErr } = await supabase.from('paid_our_worth_snapshot_row').insert(rows)
    if (rowErr) throw rowErr
  }

  return { id: snap.id }
}

/** List saved snapshots ordered by cutoff_date desc. Any approved tool user. */
export async function listSnapshots(): Promise<{ snapshots: SavedSnapshot[] }> {
  const user = await requireToolAccess('paid-our-worth')
  await checkRateLimit(rateLimits.api, `paid-our-worth:snapshot-list:${user.id}`)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('paid_our_worth_snapshot')
    .select('id, period_month, cutoff_date, working_days_in_month, days_worked, total_billable_time, total_non_billable_time, total_revenue, report_total, variance, created_at')
    .eq('org_id', ORG_ID)
    .order('cutoff_date', { ascending: false })
  if (error) throw error

  const snapshots: SavedSnapshot[] = (data ?? []).map(r => ({
    id:                   r.id,
    periodMonth:          r.period_month,
    cutoffDate:           r.cutoff_date,
    workingDaysInMonth:   r.working_days_in_month,
    daysWorked:           r.days_worked,
    totalBillableTime:    Number(r.total_billable_time),
    totalNonBillableTime: Number(r.total_non_billable_time),
    totalRevenue:         Number(r.total_revenue),
    reportTotal:          Number(r.report_total),
    variance:             Number(r.variance),
    createdAt:            r.created_at ?? '',
  }))
  return { snapshots }
}

/** Read a saved snapshot with its per-row data. Any approved tool user. */
export async function getSnapshot(id: string): Promise<{ snapshot: SavedSnapshotDetail }> {
  const user = await requireToolAccess('paid-our-worth')
  await checkRateLimit(rateLimits.api, `paid-our-worth:snapshot-get:${user.id}`)

  const supabase = createServiceClient()
  const { data: snap, error: snapErr } = await supabase
    .from('paid_our_worth_snapshot')
    .select('id, period_month, cutoff_date, working_days_in_month, days_worked, total_billable_time, total_non_billable_time, total_revenue, report_total, variance, created_at')
    .eq('id', id)
    .single()
  if (snapErr) throw snapErr

  const [{ data: rowData, error: rowErr }, { data: notes, error: notesErr }] = await Promise.all([
    supabase
      .from('paid_our_worth_snapshot_row')
      .select('job_id, job_name, is_billable, current_time_amount, revenue_amount, time_left, pct_of_total, display_order')
      .eq('snapshot_id', id)
      .order('display_order', { ascending: true }),
    supabase
      .from('paid_our_worth_note')
      .select('job_id, column_key, body')
      .eq('org_id', ORG_ID)
      .eq('period_month', isoFirstOfMonth(snap.period_month)),
  ])
  if (rowErr)   throw rowErr
  if (notesErr) throw notesErr

  const noteIndex = new Map<string, string>()
  for (const n of (notes ?? [])) {
    if (!VALID_NOTE_COLUMNS.includes(n.column_key as NoteColumn)) continue
    noteIndex.set(`${n.job_id}::${n.column_key}`, n.body)
  }
  const noteFor = (jobId: string, col: NoteColumn): string =>
    noteIndex.get(`${jobId}::${col}`) ?? ''

  const billable: BillableRow[] = []
  const nonBillable: NonBillableRow[] = []
  for (const r of (rowData ?? [])) {
    if (r.is_billable) {
      billable.push({
        jobId:       r.job_id,
        jobName:     r.job_name,
        currentTime: Number(r.current_time_amount),
        revenue:     Number(r.revenue_amount ?? 0),
        timeLeft:    Number(r.time_left ?? 0),
        notes: {
          marti_response: noteFor(r.job_id, 'marti_response'),
          response:       noteFor(r.job_id, 'response'),
        },
      })
    } else {
      nonBillable.push({
        jobId:       r.job_id,
        jobName:     r.job_name,
        currentTime: Number(r.current_time_amount),
        pctOfTotal:  Number(r.pct_of_total ?? 0),
        notes: {
          response: noteFor(r.job_id, 'response'),
        },
      })
    }
  }

  const snapshot: SavedSnapshotDetail = {
    id:                   snap.id,
    periodMonth:          snap.period_month,
    cutoffDate:           snap.cutoff_date,
    workingDaysInMonth:   snap.working_days_in_month,
    daysWorked:           snap.days_worked,
    totalBillableTime:    Number(snap.total_billable_time),
    totalNonBillableTime: Number(snap.total_non_billable_time),
    totalRevenue:         Number(snap.total_revenue),
    reportTotal:          Number(snap.report_total),
    variance:             Number(snap.variance),
    createdAt:            snap.created_at ?? '',
    billable,
    nonBillable,
  }
  return { snapshot }
}

/** Delete a single revenue row. Admin-only. */
export async function deleteRevenueRow(id: string): Promise<void> {
  const user = await requireAdminAccess()
  await checkRateLimit(rateLimits.api, `paid-our-worth:revenue-delete:${user.id}`)

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('paid_our_worth_revenue')
    .delete()
    .eq('id', id)
  if (error) throw error
}
