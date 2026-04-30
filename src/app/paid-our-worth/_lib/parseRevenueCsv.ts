// src/app/paid-our-worth/_lib/parseRevenueCsv.ts
//
// Parses a CSV with header row "Job No,Job Name,Revenue".
// Supports quoted fields with embedded commas and escaped double-quotes ("").
// Pure function — no React / fs / fetch deps.

export interface ParsedRevenueRow {
  jobId: string
  jobName: string
  revenueAmount: number
}

export interface ParseResult {
  rows: ParsedRevenueRow[]
  errors: string[]
}

const REQUIRED_HEADERS = ['Job No', 'Job Name', 'Revenue'] as const

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
      if (ch === '"') { inQuotes = false; continue }
      cur += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function splitLines(text: string): string[] {
  // Strip BOM, normalise EOL.
  const cleaned = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  return cleaned.split('\n').filter(l => l.trim().length > 0)
}

export function parseRevenueCsv(text: string): ParseResult {
  const errors: string[] = []
  const rows: ParsedRevenueRow[] = []

  const lines = splitLines(text)
  if (lines.length < 2) {
    errors.push('CSV must have a header row and at least one data row.')
    return { rows, errors }
  }

  const headers = splitCsvLine(lines[0])
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) {
      errors.push(`Missing required column: "${h}".`)
    }
  }
  if (errors.length) return { rows, errors }

  const idxJobNo  = headers.indexOf('Job No')
  const idxName   = headers.indexOf('Job Name')
  const idxRev    = headers.indexOf('Revenue')

  const seenJobIds = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const lineNo = i + 1

    const rawJobId = cells[idxJobNo] ?? ''
    const rawName  = cells[idxName]  ?? ''
    const rawRev   = cells[idxRev]   ?? ''

    if (!rawJobId && !rawName && !rawRev) continue // blank row

    const jobId = rawJobId.replace(/[^0-9]/g, '')
    if (!jobId) {
      errors.push(`Line ${lineNo}: "Job No" must be numeric (got "${rawJobId}").`)
      continue
    }

    if (!rawName) {
      errors.push(`Line ${lineNo}: "Job Name" is required.`)
      continue
    }

    const revStr = rawRev.replace(/,/g, '').replace(/\$/g, '').trim()
    const revenue = Number(revStr)
    if (revStr === '' || Number.isNaN(revenue)) {
      errors.push(`Line ${lineNo}: "Revenue" must be a number (got "${rawRev}").`)
      continue
    }

    if (seenJobIds.has(jobId)) {
      errors.push(`Line ${lineNo}: duplicate Job No "${jobId}".`)
      continue
    }
    seenJobIds.add(jobId)

    rows.push({ jobId, jobName: rawName, revenueAmount: revenue })
  }

  return { rows, errors }
}
