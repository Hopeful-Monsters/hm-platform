'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminAccess, requireToolAccess } from '@/lib/auth'
import { rateLimits } from '@/lib/upstash/ratelimit'
import { parseRevenueCsv, type ParsedRevenueRow } from './_lib/parseRevenueCsv'
import type { RevenueEntry } from './_types'

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
