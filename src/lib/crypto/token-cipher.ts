/**
 * AES-256-GCM cipher for opaque secrets stored in Postgres.
 *
 * Threat model: a leaked DB dump (support snapshot, accidental backup
 * share, Supabase-side compromise). Encrypting at the application layer
 * means the dump is useless without DRIVE_TOKEN_ENC_KEY, which lives
 * only in the platform's env vars.
 *
 * Wire format: `v1:${iv_b64}:${ciphertext_b64}:${tag_b64}` (single-line
 * ASCII so it round-trips through `text` columns and JSON without
 * escaping). The `v1:` prefix gates a future migration to v2 (key
 * rotation, different cipher) without touching every read site.
 *
 * Behaviour without DRIVE_TOKEN_ENC_KEY set:
 *   - encrypt() returns plaintext unchanged (lets dev/staging keep
 *     working without per-env key provisioning).
 *   - decrypt() returns plaintext as-is (legacy rows pre-encryption).
 *     A v1: blob with no key throws — that's a misconfiguration, not
 *     legacy data.
 */

import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12   // GCM standard
const KEY_BYTES = 32  // AES-256

function loadKey(): Buffer | null {
  const raw = process.env.DRIVE_TOKEN_ENC_KEY
  if (!raw) return null
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_BYTES) {
    throw new Error(`DRIVE_TOKEN_ENC_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`)
  }
  return buf
}

/**
 * Returns true when a key is configured and new writes will be
 * encrypted. Use to surface health-check status if needed.
 */
export function tokenCipherEnabled(): boolean {
  return loadKey() !== null
}

/** Encrypt a plaintext secret. No-op (passthrough) when key unset. */
export function encryptToken(plaintext: string): string {
  const key = loadKey()
  if (!key) return plaintext

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString('base64'),
    ciphertext.toString('base64'),
    tag.toString('base64'),
  ].join(':')
}

/**
 * Decrypt a stored secret. Treats values without the `v1:` prefix as
 * legacy plaintext (pre-encryption rows) so existing tokens keep
 * working until users re-auth or a sweep re-wraps them.
 */
export function decryptToken(stored: string): string {
  if (!stored.startsWith(`${VERSION}:`)) {
    // Legacy plaintext row. Pass through; the next write will encrypt it.
    return stored
  }

  const key = loadKey()
  if (!key) {
    throw new Error('Encrypted drive token found but DRIVE_TOKEN_ENC_KEY is not set')
  }

  const [, ivB64, ctB64, tagB64] = stored.split(':')
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error('Malformed encrypted token')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
