/**
 * Gemini API utility — generateContent with retry + model fallback.
 *
 * Strategy (Solution Four from the Gemini 503 guide):
 *   For each model in the fallback chain:
 *     - Attempt up to MAX_RETRIES_PER_MODEL times with exponential backoff + jitter
 *     - On persistent 503 (or timeout), fall through to the next model
 *     - 429 is handled with a fixed back-off on the same model (rate limit, not capacity)
 *     - Any non-transient error is re-thrown immediately
 *
 * Usage:
 *   import { geminiGenerateContent } from '@/lib/google/gemini'
 *
 *   const text = await geminiGenerateContent({
 *     key: process.env.GEMINI_KEY!,
 *     models: ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
 *     parts: [
 *       { inline_data: { mime_type: 'image/jpeg', data: base64 } },
 *       { text: 'Extract the expense details...' },
 *     ],
 *     generationConfig: { temperature: 0, maxOutputTokens: 1024 },
 *   })
 */

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models'

const MAX_RETRIES_PER_MODEL = 3  // attempts per model before falling back
const BASE_BACKOFF_MS       = 2_000  // initial wait: 2 s
const RATE_LIMIT_WAIT_MS    = 60_000 // fixed wait on 429

/** A single part in a Gemini content request. */
export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }

export interface GeminiGenerationConfig {
  temperature?: number
  maxOutputTokens?: number
  [key: string]: unknown
}

export interface GeminiGenerateContentOptions {
  /** API key — read from env at the call site, never hard-coded. */
  key: string
  /**
   * Ordered model fallback chain. The first model is the primary; subsequent
   * models are tried if the primary returns persistent 503s or times out.
   */
  models: [string, ...string[]]
  /** Content parts for the single user turn (image data, text prompt, etc.). */
  parts: GeminiPart[]
  generationConfig?: GeminiGenerationConfig
  /** Request timeout in ms per attempt. Default: 30 000 ms. */
  timeoutMs?: number
}

export class GeminiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiUnavailableError'
  }
}

/** Resolves with the raw text from the first candidate. */
export async function geminiGenerateContent(
  opts: GeminiGenerateContentOptions,
): Promise<string> {
  const { key, models, parts, generationConfig, timeoutMs = 30_000 } = opts

  const attemptErrors: string[] = []

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)

        let res: Response
        try {
          res = await fetch(
            `${GEMINI_BASE_URL}/${model}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig,
              }),
              signal: controller.signal,
            },
          )
        } finally {
          clearTimeout(timer)
        }

        // --- Success ---
        if (res.ok) {
          const data = await res.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          }
          return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        }

        // --- Transient server capacity error (503) ---
        if (res.status === 503) {
          if (attempt < MAX_RETRIES_PER_MODEL - 1) {
            const wait = BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 1_000
            console.warn(
              `[gemini] 503 on ${model} (attempt ${attempt + 1}/${MAX_RETRIES_PER_MODEL}) — retrying in ${(wait / 1000).toFixed(1)}s`,
            )
            await sleep(wait)
            continue
          }
          // Exhausted retries for this model — fall back
          attemptErrors.push(`${model}: persistent 503`)
          console.warn(`[gemini] Persistent 503 on ${model} — falling back to next model`)
          break
        }

        // --- Rate limit (429) — wait on same model ---
        if (res.status === 429) {
          console.warn(`[gemini] 429 rate limit on ${model} — waiting ${RATE_LIMIT_WAIT_MS / 1000}s`)
          await sleep(RATE_LIMIT_WAIT_MS)
          continue
        }

        // --- Non-transient error — surface immediately ---
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? `Gemini error ${res.status} on model ${model}`)

      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          attemptErrors.push(`${model}: request timed out`)
          console.warn(`[gemini] Timeout on ${model} — falling back to next model`)
          break // Try the next model
        }
        // Re-throw anything we don't recognise (e.g. network failures, non-transient errors)
        throw e
      }
    }
  }

  throw new GeminiUnavailableError(
    `All Gemini models unavailable. Errors: ${attemptErrors.join('; ')}`,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
