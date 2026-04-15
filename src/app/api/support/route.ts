import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { SUPPORT_TOOL_OPTIONS, SUPPORT_TOOL_LABELS, type SupportToolValue } from '@/lib/support'

const LINEAR_API_URL = 'https://api.linear.app/graphql'

// Linear priority values
const PRIORITY = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
  none: 0,
} as const

type UrgencyKey = keyof typeof PRIORITY

const URGENCY_LABELS: Record<UrgencyKey, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No priority',
}

// ── Validation ─────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(1).max(100),
  tool:        z.enum(SUPPORT_TOOL_OPTIONS.map(o => o.value) as [SupportToolValue, ...SupportToolValue[]]),
  tried:       z.string().min(10).max(3000),
  happened:    z.string().min(10).max(3000),
  urgency:     z.enum(['urgent', 'high', 'medium', 'low', 'none']),
})

// ── Linear GraphQL ─────────────────────────────────────────────────
const CREATE_ISSUE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`

const CREATE_ATTACHMENT_MUTATION = `
  mutation AttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
      success
      attachment {
        id
      }
    }
  }
`

interface LinearIssueInput {
  teamId: string
  title: string
  description: string
  priority: number
}

async function linearRequest<T>(body: object, apiKey: string): Promise<T> {
  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify(body),
  })

  // Always read the body — Linear often includes useful error detail even on 4xx
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = json?.errors?.[0]?.message ?? JSON.stringify(json)
    throw new Error(`Linear API ${res.status}: ${detail}`)
  }

  if (json?.errors?.length) {
    throw new Error(`Linear GraphQL error: ${json.errors[0].message}`)
  }

  return json.data
}

async function createLinearIssue(input: LinearIssueInput, apiKey: string) {
  const data = await linearRequest<{
    issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } }
  }>({ query: CREATE_ISSUE_MUTATION, variables: { input } }, apiKey)

  if (!data.issueCreate.success) throw new Error('issueCreate returned success: false')
  return data.issueCreate.issue
}

async function attachFileToIssue(issueId: string, url: string, title: string, apiKey: string) {
  await linearRequest({
    query: CREATE_ATTACHMENT_MUTATION,
    variables: {
      input: { issueId, url, title },
    },
  }, apiKey)
}

// ── Screenshot upload ──────────────────────────────────────────────
const SCREENSHOT_BUCKET = 'support-attachments'
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
// Signed URL valid for 90 days — long enough for any support resolution cycle
const SIGNED_URL_EXPIRY_SECONDS = 90 * 24 * 60 * 60

// MIME → file extension map. Extension is derived server-side, not from user input.
const MIME_TO_EXT: Record<string, string> = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

async function uploadScreenshot(
  file: File,
  userId: string
): Promise<string | null> {
  if (!ALLOWED_MIME.includes(file.type)) return null
  if (file.size > MAX_FILE_BYTES) return null

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext  = MIME_TO_EXT[file.type] ?? 'png'
  const path = `${userId}/${Date.now()}.${ext}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    console.error('Screenshot upload failed:', error.message)
    return null
  }

  const { data, error: signError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !data?.signedUrl) {
    console.error('Signed URL generation failed:', signError?.message)
    return null
  }

  return data.signedUrl
}

// ── Route handler ──────────────────────────────────────────────────
export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Rate limit ──────────────────────────────────────────────────
  const limited = await applyRateLimit(rateLimits.api, `support:${user.id}`)
  if (limited) return limited

  // ── Parse multipart form ────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const fields = {
    name:     formData.get('name')?.toString().trim(),
    tool:     formData.get('tool')?.toString(),
    tried:    formData.get('tried')?.toString(),
    happened: formData.get('happened')?.toString(),
    urgency:  formData.get('urgency')?.toString(),
  }

  const result = schema.safeParse(fields)
  if (!result.success) {
    return Response.json(
      { error: 'Invalid request', issues: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, tool, tried, happened, urgency } = result.data

  // ── Env checks ──────────────────────────────────────────────────
  const teamId = process.env.LINEAR_TEAM_ID
  const apiKey = process.env.LINEAR_API_KEY
  if (!teamId || !apiKey) {
    console.error('LINEAR_TEAM_ID or LINEAR_API_KEY is not set')
    return Response.json({ error: 'Support is temporarily unavailable' }, { status: 503 })
  }

  // ── Screenshot (optional) ───────────────────────────────────────
  const screenshotFile = formData.get('screenshot')
  let screenshotUrl: string | null = null
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    screenshotUrl = await uploadScreenshot(screenshotFile, user.id)
  }

  // ── Build Linear issue ──────────────────────────────────────────
  const submitterName = name
  const toolLabel = SUPPORT_TOOL_LABELS[tool as SupportToolValue]
  const urgencyLabel = URGENCY_LABELS[urgency as UrgencyKey]

  // Auto-generate title from "what they tried to do" (first 100 chars)
  const rawTitle = tried.replace(/\n/g, ' ').trim()
  const title = rawTitle.length > 100 ? rawTitle.slice(0, 97) + '…' : rawTitle

  const descriptionLines = [
    `**Submitted by:** ${submitterName} (${user.email})`,
    `**Tool:** ${toolLabel}`,
    `**Urgency:** ${urgencyLabel}`,
    '',
    '---',
    '',
    '## What were you trying to do?',
    tried,
    '',
    '## What happened instead?',
    happened,
  ]

  if (screenshotUrl) {
    descriptionLines.push('', '---', '', `**Screenshot:** [View](${screenshotUrl})`)
  }

  const issueInput: LinearIssueInput = {
    teamId,
    title,
    description: descriptionLines.join('\n'),
    priority: PRIORITY[urgency as UrgencyKey],
  }

  // ── Create issue ────────────────────────────────────────────────
  try {
    const issue = await createLinearIssue(issueInput, apiKey)

    // Attach screenshot as a Linear attachment if uploaded
    if (screenshotUrl) {
      await attachFileToIssue(issue.id, screenshotUrl, 'Screenshot', apiKey).catch(err =>
        console.warn('Attachment create failed (non-fatal):', err)
      )
    }

    return Response.json({
      ok: true,
      issue: { identifier: issue.identifier, url: issue.url },
    })
  } catch (err) {
    console.error('Failed to create Linear issue:', err)
    return Response.json(
      { error: 'Failed to submit support request. Please try again.' },
      { status: 502 }
    )
  }
}
