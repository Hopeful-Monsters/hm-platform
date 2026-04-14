import type { Job, QueueItem } from './_types'

// ── Date / time ───────────────────────────────────────────────────

export const todayStr = () => new Date().toISOString().split('T')[0]
export const sleep    = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function isOldDate(dateStr: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

// ── Australian financial year month ordering ──────────────────────
// AFY runs July–June; months are numbered 1–12 within the FY.

export function afyMonthIndex(dateStr: string): number | null {
  if (!dateStr) return null
  const m = parseInt(dateStr.split('-')[1], 10)
  return m >= 7 ? m - 6 : m + 6
}

export function monthLabel(dateStr: string): string | null {
  if (!dateStr) return null
  const [y, m] = dateStr.split('-')
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

export function afyFolderName(dateStr: string): string | null {
  const idx   = afyMonthIndex(dateStr)
  const label = monthLabel(dateStr)
  return idx && label ? `${idx}. ${label}` : null
}

// ── Formatting ────────────────────────────────────────────────────

export function fmtSize(b: number): string {
  if (b < 1024)        return `${b} B`
  if (b < 1024 ** 2)   return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

// ── Streamtime data normalisation ─────────────────────────────────

export function normaliseJob(r: Record<string, unknown>): Job {
  return {
    id:     String(r.id ?? r.jobId ?? r['Job ID'] ?? r['ID']),
    name:   String(r.name ?? r.jobName ?? r['Job Name'] ?? r['Name'] ?? ''),
    num:    String(r.number ?? r.jobNumber ?? r['Job Number'] ?? r['Number'] ?? '') || null,
    full:   String(r.fullName ?? r['Full Name'] ?? '') || null,
    client: String(
      (typeof r.company === 'object'
        ? (r.company as Record<string, unknown>)?.name
        : r.company
      ) ?? r.companyName ?? r['Company'] ?? r['Client'] ?? ''
    ),
  }
}

// ── Google Drive filename ─────────────────────────────────────────

export function buildFilename(
  item: QueueItem,
  jobNum: string | null,
  jobId: string,
  initials: string,
): string | null {
  const d = item.extracted
  if (!d.date || !d.supplier || d.totalIncGST == null || d.totalIncGST === '') return null
  const [y, m, day] = d.date.split('-')
  const fdate = `${day}.${m}.${(y || '').slice(2)}`
  const fsup  = d.supplier.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '')
  const amt   = parseFloat(String(d.totalIncGST)).toFixed(2)
  const ext   = item.mimeType === 'application/pdf'
    ? '.pdf'
    : `.${item.file.name.split('.').pop() || 'jpg'}`
  return `${fdate}_${fsup}_${initials || 'XX'}_${jobNum || jobId}_$${amt}${ext}`
}
