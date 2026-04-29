/**
 * Pure CSV parsing + field mapping for the Coverage Tracker.
 *
 * The Meltwater export ships as a UTF-16 tab-delimited .csv with headers
 * on the first row. Each helper here is single-input, single-output, and
 * has no React/Next dependencies — fine for unit testing in isolation.
 */

import type { CoverageRow } from './types'

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('File has fewer than 2 lines')
  const headers = lines[0].split('\t').map(h => h.replace(/^['"]+|['"]+$/g, '').trim())
  return lines.slice(1)
    .map(line => {
      const vals = line.split('\t')
      return headers.reduce<Record<string, string>>((obj, h, i) => {
        obj[h] = (vals[i] ?? '').replace(/^['"]+|['"]+$/g, '').trim()
        return obj
      }, {})
    })
    .filter(r => r['Title'] || r['Source Name'])
}

export function fmtDate(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d
}

export function deriveFormat(sourceType: string): string {
  const s = (sourceType ?? '').toLowerCase()
  if (s.includes('print'))                            return 'PRINT'
  if (s.includes('online'))                           return 'ONLINE'
  if (s.includes('broadcast') || s.includes('tv'))    return 'TV'
  if (s.includes('radio')     || s.includes('audio')) return 'RADIO'
  if (s.includes('social'))                           return 'SOCIAL MEDIA'
  if (s.includes('podcast'))                          return 'PODCAST'
  return 'ONLINE'
}

export function fmtSentiment(s: string): string {
  const lower = (s ?? '').toLowerCase()
  // Neutral collapses to Positive — only POSITIVE / NEGATIVE exist downstream
  if (lower === 'positive' || lower === 'neutral') return 'POSITIVE'
  if (lower === 'negative')                        return 'NEGATIVE'
  return s ? s.toUpperCase() : ''
}

export function parseAVE(v: string): string {
  if (!v || v === 'NaN') return ''
  const n = parseFloat(v.replace(/,/g, ''))
  return isNaN(n) ? '' : String(n)
}

export function mapRow(r: Record<string, string>): CoverageRow {
  const ave    = parseAVE(r['AVE'] ?? '')
  const aveNum = ave !== '' ? parseFloat(ave) : 0
  return {
    date:        fmtDate(r['Date'] ?? ''),
    campaign:    '',
    publication: r['Source Name']  ?? '',
    country:     r['Country']      ?? '',
    mediaType:   '',
    mediaFormat: deriveFormat(r['Source Type'] ?? ''),
    headline:    r['Title']        ?? '',
    reach:       r['Reach']        ?? '',
    ave,
    prValue:     aveNum > 0 ? String((aveNum * 3).toFixed(2)) : '',
    sentiment:   fmtSentiment(r['Sentiment'] ?? ''),
    keyMsg:      '',
    spokes:      '',
    image:       '',
    cta:         '',
    link:        r['URL']          ?? '',
  }
}

export function rowToArray(r: CoverageRow): (string | number)[] {
  return [
    r.date, r.campaign, r.publication, r.country,
    r.mediaType, r.mediaFormat, r.headline,
    r.reach   !== '' ? (Number(r.reach)   || r.reach)   : '',
    r.ave     !== '' ? (Number(r.ave)     || r.ave)     : '',
    r.prValue !== '' ? (Number(r.prValue) || 0)         : 0,
    r.sentiment, r.keyMsg, r.spokes, r.image, r.cta, r.link,
  ]
}
