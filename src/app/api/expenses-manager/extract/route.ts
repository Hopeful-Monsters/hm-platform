import { z } from 'zod'
import { requireToolAccess } from '@/lib/auth'
import { rateLimits, applyRateLimit } from '@/lib/upstash/ratelimit'

// Permitted MIME types — only receipts/invoices (images + PDF)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const

const ExtractBodySchema = z.object({
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, PDF',
  }),
  data: z.string().min(1, 'data must not be empty'),
})

const EXTRACT_PROMPT = `Extract the expense details from this receipt or invoice. Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

{
  "date": "YYYY-MM-DD",
  "supplier": "Vendor or company name",
  "itemName": "Brief description of what was purchased",
  "reference": "Invoice or receipt number, or null if not visible",
  "amountExGST": 0.00,
  "gstAmount": 0.00,
  "totalIncGST": 0.00
}

Rules:
- All amounts must be numbers, not strings
- If GST is not itemised separately: assume 10% GST is included in the total
  (amountExGST = total / 1.1 rounded to 2 decimal places; gstAmount = total − amountExGST)
- If no GST applies: set gstAmount to 0 and amountExGST equal to totalIncGST
- If the date is ambiguous or missing, use today: __TODAY__
- Currency is AUD — do not include it in the JSON`

export async function POST(request: Request) {
  // Auth — must be signed in, approved, and have expenses-manager access
  const user = await requireToolAccess('expenses-manager').catch(() => null)
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Rate limit — use the AI limiter (10/min) since this hits an LLM
  const limited = await applyRateLimit(rateLimits.ai, `expenses-manager:extract:${user.id}`)
  if (limited) return limited

  const key = process.env.GEMINI_KEY
  if (!key) return Response.json({ error: 'Extraction service is not configured' }, { status: 500 })

  const rawBody = await request.json().catch(() => null)
  const parsed = ExtractBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 },
    )
  }
  const body = parsed.data

  const today = new Date().toISOString().split('T')[0]
  const prompt = EXTRACT_PROMPT.replace('__TODAY__', today)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: body.mimeType, data: body.data } }, { text: prompt }] }], // body is typed via Zod — mimeType is a permitted enum value
        generationConfig: { temperature: 0, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return Response.json(
      { error: err.error?.message || `Gemini error ${res.status}` },
      { status: res.status }
    )
  }

  const geminiData = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  let txt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
  txt = txt.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    const extracted = JSON.parse(txt)
    return Response.json(extracted)
  } catch {
    return Response.json(
      { error: `Could not parse Gemini response: ${txt.slice(0, 200)}` },
      { status: 500 }
    )
  }
}
