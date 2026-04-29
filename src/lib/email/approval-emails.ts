/**
 * Transactional emails sent from the admin approvals flow.
 *
 * All three templates share the same Resend sender + signing domain;
 * keeping them together lets the admin actions stay focused on data
 * mutations rather than transport details.
 *
 * Email failures are logged but never throw — approval/denial is the
 * source of truth in the database, and a failed notification should
 * not roll back the access grant.
 */

import 'server-only'
import { Resend } from 'resend'
import { TOOL_LABEL, type ToolSlug } from '@/lib/tools'

const FROM_EMAIL = 'noreply@hopefulmonsters.com.au'
const SIGN_IN_URL = 'app.hopefulmonsters.com.au'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function sendUserApprovedEmail(
  to: string,
  grantedTools: string[],
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to,
      subject: 'Account Approved — Hopeful Monsters',
      text:    `Your account has been approved. You now have access to: ${grantedTools.join(', ')}. Sign in at ${SIGN_IN_URL}`,
    })
  } catch (err) {
    console.error('sendUserApprovedEmail failed (non-fatal):', err)
  }
}

export async function sendToolAccessGrantedEmail(
  to: string,
  toolSlug: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const toolLabel = TOOL_LABEL[toolSlug as ToolSlug] ?? toolSlug
  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to,
      subject: `Access Granted — ${toolLabel}`,
      text:    `Your request for access to ${toolLabel} has been approved.\n\nSign in at ${SIGN_IN_URL} to get started.`,
    })
  } catch (err) {
    console.error('sendToolAccessGrantedEmail failed (non-fatal):', err)
  }
}

export async function sendToolAccessDeniedEmail(
  to: string,
  toolSlug: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const toolLabel = TOOL_LABEL[toolSlug as ToolSlug] ?? toolSlug
  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to,
      subject: `Access Request Update — ${toolLabel}`,
      text:    `Your request for access to ${toolLabel} has not been approved at this time.\n\nIf you think this is a mistake, reply to this email.`,
    })
  } catch (err) {
    console.error('sendToolAccessDeniedEmail failed (non-fatal):', err)
  }
}
