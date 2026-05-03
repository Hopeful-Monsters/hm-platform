// src/app/paid-our-worth/_lib/holidays.ts
//
// NSW public holiday calculations. Pure functions — no IO.
//
// Reference: NSW Industrial Relations — public-holidays page.
// Notes:
//   - Australia Day: if 26 Jan falls on Sat/Sun, the public holiday moves to
//     the following Monday.
//   - Christmas / Boxing / New Year's: weekend-falling days roll forward to
//     the next available weekday (Mon/Tue) per NSW rules.
//   - Anzac Day: 25 April is always gazetted. When it falls on a weekend
//     NSW typically gazettes the following Monday as an additional public
//     holiday (e.g. Mon 27 Apr 2026 for the 2026 Sat 25 Apr).
//   - Easter Saturday / Sunday: gazetted as public holidays in NSW but always
//     fall on a weekend, so they do not affect working-day counts.
//   - Bank Holiday (1st Mon Aug) is a banks-only holiday and is NOT counted
//     as a general public holiday here.
//
// All dates returned in 'YYYY-MM-DD' (local Sydney calendar).

function pad(n: number): string { return String(n).padStart(2, '0') }
function iso(y: number, m1: number, d: number): string { return `${y}-${pad(m1)}-${pad(d)}` }

/** Anonymous Gregorian algorithm for Easter Sunday. */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)       // 3 or 4
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

function shiftToMonday(year: number, month1: number, day: number): { y: number; m: number; d: number } {
  const date = new Date(Date.UTC(year, month1 - 1, day))
  const dow = date.getUTCDay() // 0 Sun, 6 Sat
  if (dow === 6) date.setUTCDate(day + 2)
  else if (dow === 0) date.setUTCDate(day + 1)
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }
}

/** Christmas / Boxing / New Year roll-forward rules per NSW. */
function nyChristmasBoxing(year: number): string[] {
  const out: string[] = []

  // Christmas Day (25 Dec) and Boxing Day (26 Dec).
  // If 25 = Sat → Christmas observed Mon 27, Boxing Tue 28.
  // If 25 = Sun → Christmas Mon 26... but Boxing Day is also 26, so Boxing → Tue 27.
  // If 26 = Sat → Boxing observed Mon 28.
  const xmas = new Date(Date.UTC(year, 11, 25))
  const xmasDow = xmas.getUTCDay()
  if (xmasDow === 6) {
    out.push(iso(year, 12, 25), iso(year, 12, 27), iso(year, 12, 28))
  } else if (xmasDow === 0) {
    out.push(iso(year, 12, 25), iso(year, 12, 26), iso(year, 12, 27))
  } else if (xmasDow === 5) {
    // 25 Fri, 26 Sat → Boxing Day observed Mon 28
    out.push(iso(year, 12, 25), iso(year, 12, 26), iso(year, 12, 28))
  } else {
    out.push(iso(year, 12, 25), iso(year, 12, 26))
  }

  // New Year's Day (1 Jan) — observed Monday if weekend.
  const nyShift = shiftToMonday(year, 1, 1)
  out.push(iso(nyShift.y, nyShift.m, nyShift.d))

  return out
}

/**
 * NSW public holidays for the given calendar year, returned as a Set
 * of 'YYYY-MM-DD' strings. Includes only days that affect a Mon–Fri
 * working-day count (i.e. Easter Sat/Sun and weekend Anzac Day are
 * excluded — they fall on weekends anyway).
 */
export function nswPublicHolidays(year: number): Set<string> {
  const out = new Set<string>()

  // New Year's Day (with NY Day rollover from previous year possibly landing
  // on first business day of January — included via nyChristmasBoxing(year-1)
  // / nyChristmasBoxing(year) on the appropriate side).
  const nyThis = shiftToMonday(year, 1, 1)
  out.add(iso(nyThis.y, nyThis.m, nyThis.d))

  // Australia Day — observed Monday if 26 Jan falls on weekend.
  const aus = shiftToMonday(year, 1, 26)
  out.add(iso(aus.y, aus.m, aus.d))

  // Easter — Good Friday, Easter Monday.
  const e = easterSunday(year)
  const easter = new Date(Date.UTC(year, e.month - 1, e.day))
  const goodFriday  = new Date(easter); goodFriday.setUTCDate(easter.getUTCDate() - 2)
  const easterMon   = new Date(easter); easterMon.setUTCDate(easter.getUTCDate() + 1)
  out.add(iso(goodFriday.getUTCFullYear(), goodFriday.getUTCMonth() + 1, goodFriday.getUTCDate()))
  out.add(iso(easterMon.getUTCFullYear(),  easterMon.getUTCMonth() + 1,  easterMon.getUTCDate()))

  // Anzac Day — 25 April. Add the substitute Monday when Anzac falls on a
  // weekend (NSW gazettes the following Monday as an additional public
  // holiday in those years). The 25th itself is gazetted regardless but
  // only affects the working-day count when it falls Mon–Fri.
  const anzac = new Date(Date.UTC(year, 3, 25)) // April = month 3 (0-indexed)
  const anzacDow = anzac.getUTCDay()
  if (anzacDow !== 0 && anzacDow !== 6) {
    out.add(iso(year, 4, 25))
  } else {
    const sub = shiftToMonday(year, 4, 25)
    out.add(iso(sub.y, sub.m, sub.d))
  }

  // King's Birthday — 2nd Monday in June.
  const june1 = new Date(Date.UTC(year, 5, 1))
  const offset = (1 - june1.getUTCDay() + 7) % 7        // first Monday offset
  const kingsDay = 1 + offset + 7                       // second Monday
  out.add(iso(year, 6, kingsDay))

  // Labour Day — 1st Monday in October.
  const oct1 = new Date(Date.UTC(year, 9, 1))
  const lOffset = (1 - oct1.getUTCDay() + 7) % 7
  out.add(iso(year, 10, 1 + lOffset))

  // Christmas / Boxing / NY-rollover into next January.
  for (const d of nyChristmasBoxing(year)) out.add(d)

  return out
}

/** True if (yyyy-mm-dd) is a Mon–Fri that is not a NSW public holiday. */
export function isWorkingDay(isoDate: string, holidays: Set<string>): boolean {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay()
  if (dow === 0 || dow === 6) return false
  return !holidays.has(isoDate)
}

/** First-of-month date string for the given period (any iso date in that month). */
export function firstOfMonth(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number)
  return iso(y, m, 1)
}

/** Last-of-month date string for the given period. */
export function lastOfMonth(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return iso(y, m, last)
}

/** Count NSW working days in the month containing `isoDate`. */
export function workingDaysInMonth(isoDate: string): number {
  const [y, m] = isoDate.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const holidays = new Set([
    ...nswPublicHolidays(y),
    ...nswPublicHolidays(y - 1),
    ...nswPublicHolidays(y + 1),
  ])
  let count = 0
  for (let d = 1; d <= last; d++) {
    if (isWorkingDay(iso(y, m, d), holidays)) count++
  }
  return count
}

/**
 * Count working days from the first of the month up to and including
 * `cutoffDate` (which must be in that month). If cutoff is before the
 * first of the month, returns 0.
 */
export function workingDaysToCutoff(cutoffDate: string): number {
  const [y, m, d] = cutoffDate.split('-').map(Number)
  if (d < 1) return 0
  const holidays = new Set([
    ...nswPublicHolidays(y),
    ...nswPublicHolidays(y - 1),
    ...nswPublicHolidays(y + 1),
  ])
  let count = 0
  for (let day = 1; day <= d; day++) {
    if (isWorkingDay(iso(y, m, day), holidays)) count++
  }
  return count
}
