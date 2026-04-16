/**
 * Google Sheets API helpers — server-side only.
 *
 * Uses the user's stored OAuth refresh token (from drive_tokens table) to
 * obtain a short-lived access token, then calls the Sheets/Drive APIs.
 *
 * No service account involved — all writes are made as the authenticated user,
 * so no email-sharing setup is required for existing spreadsheets.
 */

// Coverage Tracker column headers (columns B–Q in the sheet)
export const COVERAGE_HEADERS = [
  'DATE', 'CAMPAIGN', 'PUBLICATION', 'COUNTRY',
  'MEDIA TYPE', 'MEDIA FORMAT', 'HEADLINE', 'REACH',
  'AVE', 'PR VALUE', 'SENTIMENT', '2+ KEY MESSAGES',
  'SPOKES QUOTE (Y/N)', 'IMAGE (Y/N)', 'CTA (Y/N)', 'LINK',
] as const

/**
 * Exchange a stored refresh token for a short-lived access token.
 * Throws if the exchange fails (e.g. token revoked — caller should clear the token).
 */
export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json() as {
    access_token?:       string
    error?:              string
    error_description?:  string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Token refresh failed (${res.status})`)
  }
  return data.access_token
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Append rows to an existing spreadsheet tab.
 * Each row is an array of values matching COVERAGE_HEADERS order (B–Q).
 */
export async function appendRows(
  token:    string,
  sheetId:  string,
  sheetTab: string,
  rows:     (string | number)[][],
): Promise<void> {
  const range = encodeURIComponent(`${sheetTab}!B:Q`)
  const url   =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const res  = await fetch(url, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ values: rows }),
  })
  const data = await res.json() as { error?: { message?: string } }

  if (!res.ok) {
    const msg = data.error?.message ?? JSON.stringify(data)
    if (msg.includes('Unable to parse range')) {
      throw new Error(`Tab "${sheetTab}" was not found. Check the tab name is exact (case-sensitive).`)
    }
    if (res.status === 403) {
      throw new Error('Permission denied — make sure your Google account has Editor access to this spreadsheet.')
    }
    throw new Error(msg)
  }
}

/**
 * Create a new Google Spreadsheet with the Coverage Tracker header row pre-populated.
 * Returns the new spreadsheet ID.
 */
export async function createSpreadsheet(
  token:   string,
  title:   string,
  tabName: string,
): Promise<string> {
  const headerRow = {
    values: COVERAGE_HEADERS.map(h => ({
      userEnteredValue:  { stringValue: h },
      userEnteredFormat: { textFormat: { bold: true } },
    })),
  }

  const body = {
    properties: { title: title || 'Coverage Tracker' },
    sheets: [{
      properties: { title: tabName || '2026 Coverage Tracker' },
      data: [{
        startRow:    0,
        startColumn: 1, // Column B — column A intentionally left empty
        rowData:     [headerRow],
      }],
    }],
  }

  const res  = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify(body),
  })
  const data = await res.json() as { spreadsheetId?: string; error?: { message?: string } }

  if (!res.ok) throw new Error(data.error?.message ?? 'Failed to create spreadsheet')
  if (!data.spreadsheetId) throw new Error('Spreadsheet created but no ID returned')
  return data.spreadsheetId
}

/**
 * Share a spreadsheet with an email address (Editor access).
 * Non-fatal — warns on failure rather than throwing, since the sheet was already written.
 */
export async function shareSheet(
  token:   string,
  sheetId: string,
  email:   string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`,
    {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ role: 'writer', type: 'user', emailAddress: email }),
    },
  )
  if (!res.ok) {
    const data = await res.json() as { error?: { message?: string } }
    console.warn('[sheets] shareSheet failed:', data.error?.message ?? res.status)
  }
}
