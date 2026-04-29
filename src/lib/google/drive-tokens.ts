/**
 * Read/write wrappers for the drive_tokens table.
 *
 * Centralises encryption of the refresh_token column so route handlers
 * never see the raw cipher format. All four call sites (drive callback
 * write + sheets-append/sheets-create/expenses-upload reads) go through
 * here.
 */

import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { encryptToken, decryptToken } from '@/lib/crypto/token-cipher'

/**
 * Fetch and decrypt the user's stored Drive refresh token.
 * Returns null when no row exists. Throws on malformed ciphertext.
 */
export async function getDriveRefreshToken(userId: string): Promise<string | null> {
  const { data } = await createServiceClient()
    .from('drive_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data?.refresh_token) return null
  return decryptToken(data.refresh_token)
}

/**
 * Encrypt and upsert the user's Drive refresh token.
 * Caller is responsible for ensuring `userId` corresponds to an
 * authenticated request — service role bypasses RLS.
 */
export async function setDriveRefreshToken(userId: string, refreshToken: string): Promise<{ error?: string }> {
  const ciphertext = encryptToken(refreshToken)
  const { error } = await createServiceClient()
    .from('drive_tokens')
    .upsert({
      user_id:       userId,
      refresh_token: ciphertext,
      updated_at:    new Date().toISOString(),
    })
  return error ? { error: error.message } : {}
}

/**
 * Remove the user's Drive token row — used both by the explicit
 * disconnect action and by readers that detect a revoked refresh token.
 */
export async function clearDriveRefreshToken(userId: string): Promise<void> {
  await createServiceClient()
    .from('drive_tokens')
    .delete()
    .eq('user_id', userId)
}
