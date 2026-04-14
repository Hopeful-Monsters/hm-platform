import { createClient } from '@/lib/supabase/server'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { afyFolderName, afyMonthIndex } from '@/app/expenses-manager/_utils'

// ── Token management ──────────────────────────────────────────────────────────

async function getAccessToken(refreshToken: string): Promise<string> {
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
  const data = await res.json() as { access_token?: string; error?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || `Failed to refresh access token (${res.status})`)
  }
  return data.access_token
}

// ── Folder management ─────────────────────────────────────────────────────────

type DriveFile = { id: string; name: string }

async function searchFolders(token: string, query: string): Promise<DriveFile[]> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`Folder search failed (${res.status})`)
  return ((await res.json() as { files?: DriveFile[] }).files || [])
}

async function getOrCreateMonthFolder(
  token:     string,
  dateStr:   string,
  parentId:  string | null,
): Promise<string | null> {
  const folderName = afyFolderName(dateStr)
  if (!folderName) return null

  // Try exact name match first
  if (parentId) {
    const found = await searchFolders(
      token,
      `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`,
    )
    if (found.length) return found[0].id
  }

  // Try prefix match (e.g. "4. April 2026" even if name differs slightly)
  const idxPrefix = String(afyMonthIndex(dateStr))
  if (parentId && idxPrefix) {
    const found2 = await searchFolders(
      token,
      `mimeType='application/vnd.google-apps.folder' and name contains '${idxPrefix}. ' and '${parentId}' in parents and trashed=false`,
    ).catch(() => [] as DriveFile[])
    const match = found2.find(f => f.name.startsWith(`${idxPrefix}. `) || f.name.startsWith(`${idxPrefix}.`))
    if (match) return match.id
  }

  // Create the folder
  const meta: Record<string, unknown> = {
    name:     folderName,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) meta.parents = [parentId]

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(meta),
  })
  if (!res.ok) throw new Error(`Folder creation failed (${res.status})`)
  return ((await res.json()) as DriveFile).id
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit
  const limited = await applyRateLimit(rateLimits.api, `expenses-manager:drive-upload:${user.id}`)
  if (limited) return limited

  // Refresh token from user_metadata
  const meta         = (user.user_metadata ?? {}) as Record<string, unknown>
  const refreshToken = meta.drive_refresh_token as string | undefined
  if (!refreshToken) {
    return Response.json({ error: 'Google Drive not connected. Reconnect in the Expenses Manager.' }, { status: 403 })
  }

  // Parse multipart form — file + optional date for folder placement
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  if (!(fileEntry instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  const filename = formData.get('filename') as string | null ?? fileEntry.name
  const dateStr  = formData.get('date')     as string | null ?? ''

  // Get a fresh access token
  let accessToken: string
  try {
    accessToken = await getAccessToken(refreshToken)
  } catch (err: unknown) {
    // Likely the refresh token was revoked — clear it so the UI shows "disconnected"
    await supabase.auth.updateUser({ data: { drive_refresh_token: null } }).catch(() => {})
    return Response.json(
      { error: `Drive auth expired — please reconnect. (${(err as Error).message})` },
      { status: 401 },
    )
  }

  // Locate or create the target month folder
  const parentId = process.env.EXPENSES_DRIVE_FOLDER_ID || null
  let folderId: string | null = null
  if (dateStr) {
    try {
      folderId = await getOrCreateMonthFolder(accessToken, dateStr, parentId)
    } catch (err: unknown) {
      console.warn('[drive/upload] month folder:', (err as Error).message)
    }
  }

  // Upload via multipart
  const fileMeta: Record<string, unknown> = { name: filename }
  const targetFolder = folderId ?? parentId
  if (targetFolder) fileMeta.parents = [targetFolder]

  const body = new FormData()
  body.append('metadata', new Blob([JSON.stringify(fileMeta)], { type: 'application/json' }))
  body.append('file', fileEntry, filename)

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    },
  )

  const result = await uploadRes.json() as Record<string, unknown>
  if (!uploadRes.ok) {
    const msg = ((result.error as Record<string, unknown>)?.message as string) || `Drive error ${uploadRes.status}`
    return Response.json({ error: msg }, { status: uploadRes.status })
  }

  return Response.json({ id: result.id })
}
