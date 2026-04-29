import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'
import { SUPPORT_TOOL_OPTIONS, SUPPORT_TOOL_LABELS, type SupportToolValue } from '@/lib/support'
import { MAX_UPLOAD_BYTES } from '@/lib/constants/file-limits'
import { createLinearIssue, attachFileToLinearIssue, type LinearIssueInput } from '@/lib/linear/client'
import { buildSupportIssueTitle, buildSupportIssueDescription } from '@/lib/support/format-issue'

const PRIORITY = {
  urgent: 1,
  high:   2,
  medium: 3,
  low:    4,
  none:   0,
} as const

type UrgencyKey = keyof typeof PRIORITY

const URGENCY_LABELS: Record<UrgencyKey, string> = {
  urgent: 'Urgent',
  high:   'High',
  medium: 'Medium',
  low:    'Low',
  none:   'No priority',
}

const schema = z.object({
  name:     z.string().min(1).max(100),
  tool:     z.enum(SUPPORT_TOOL_OPTIONS.map(o => o.value) as [SupportToolValue, ...SupportToolValue[]]),
  tried:    z.string().min(10).max(3000),
  happened: z.string().min(10).max(3000),
  urgency:  z.enum(['urgent', 'high', 'medium', 'low', 'none']),
})

// ── Screenshot upload ──────────────────────────────────────────────
const SCREENSHOT_BUCKET = 'support-attachments'
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
// Signed URL valid for 90 days — long enough for any support resolution cycle
const SIGNED_URL_EXPIRY_SECONDS = 90 * 24 * 60 * 60

const MIME_TO_EXT: Record<string, string> = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

async function uploadScreenshot(file: File, userId: string): Promise<string | null> {
  if (!ALLOWED_MIME.includes(file.type)) return null
  if (file.size > MAX_UPLOAD_BYTES) return null

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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(rateLimits.api, `support:${user.id}`)
  if (limited) return limited

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const result = schema.safeParse({
    name:     formData.get('name')?.toString().trim(),
    tool:     formData.get('tool')?.toString(),
    tried:    formData.get('tried')?.toString(),
    happened: formData.get('happened')?.toString(),
    urgency:  formData.get('urgency')?.toString(),
  })
  if (!result.success) {
    return Response.json(
      { error: 'Invalid request', issues: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, tool, tried, happened, urgency } = result.data

  const teamId = process.env.LINEAR_TEAM_ID
  const apiKey = process.env.LINEAR_API_KEY
  if (!teamId || !apiKey) {
    console.error('LINEAR_TEAM_ID or LINEAR_API_KEY is not set')
    return Response.json({ error: 'Support is temporarily unavailable' }, { status: 503 })
  }

  const screenshotFile = formData.get('screenshot')
  let screenshotUrl: string | null = null
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    screenshotUrl = await uploadScreenshot(screenshotFile, user.id)
  }

  const issueInput: LinearIssueInput = {
    teamId,
    title:       buildSupportIssueTitle(tried),
    description: buildSupportIssueDescription({
      submitterName:  name,
      submitterEmail: user.email ?? 'unknown',
      toolLabel:      SUPPORT_TOOL_LABELS[tool as SupportToolValue],
      urgencyLabel:   URGENCY_LABELS[urgency as UrgencyKey],
      tried,
      happened,
      screenshotUrl,
    }),
    priority: PRIORITY[urgency as UrgencyKey],
  }

  try {
    const issue = await createLinearIssue(issueInput, apiKey)

    if (screenshotUrl) {
      await attachFileToLinearIssue(issue.id, screenshotUrl, 'Screenshot', apiKey).catch(err =>
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
