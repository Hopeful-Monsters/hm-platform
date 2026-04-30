'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TOOL_SLUGS } from '@/lib/tools'
import {
  sendUserApprovedEmail,
  sendToolAccessGrantedEmail,
  sendToolAccessDeniedEmail,
} from '@/lib/email/approval-emails'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return null
  return user
}

export async function approveUser(formData: FormData) {
  if (!await requireAdmin()) return

  const userId        = formData.get('userId') as string
  // Validate slugs against the canonical list — rejects any forged values
  const selectedTools = (formData.getAll('tools') as string[]).filter(slug => TOOL_SLUGS.includes(slug))

  const service = createServiceClient()

  await service.auth.admin.updateUserById(userId, {
    user_metadata: { status: 'approved' },
  })

  if (selectedTools.length > 0) {
    await service.from('tool_access').insert(
      selectedTools.map(toolSlug => ({ user_id: userId, tool_slug: toolSlug, plan: 'basic' }))
    )
  }

  const { data: userData } = await service.auth.admin.getUserById(userId)
  if (userData.user?.email) {
    await sendUserApprovedEmail(userData.user.email, selectedTools)
  }

  revalidatePath('/admin/approvals')
}

export async function approveToolRequest(formData: FormData) {
  if (!await requireAdmin()) return

  const requestId = formData.get('requestId') as string
  const userId    = formData.get('userId') as string
  const userEmail = formData.get('userEmail') as string
  const toolSlug  = formData.get('toolSlug') as string

  if (!TOOL_SLUGS.includes(toolSlug)) return

  const service = createServiceClient()

  const { error: accessError } = await service
    .from('tool_access')
    .insert({ user_id: userId, tool_slug: toolSlug, plan: 'basic' })
  if (accessError) {
    console.error('approveToolRequest: failed to grant tool access:', accessError.message)
    return
  }

  const { error: updateError } = await service
    .from('tool_access_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)
  if (updateError) {
    console.error('approveToolRequest: failed to update request status:', updateError.message)
  }

  if (userEmail) {
    await sendToolAccessGrantedEmail(userEmail, toolSlug)
  }

  revalidatePath('/admin/approvals')
}

export async function denyToolRequest(formData: FormData) {
  if (!await requireAdmin()) return

  const requestId = formData.get('requestId') as string
  const userEmail = formData.get('userEmail') as string
  const toolSlug  = formData.get('toolSlug') as string

  if (!TOOL_SLUGS.includes(toolSlug)) return

  const service = createServiceClient()

  const { error: updateError } = await service
    .from('tool_access_requests')
    .update({ status: 'denied' })
    .eq('id', requestId)
  if (updateError) {
    console.error('denyToolRequest: failed to update request status:', updateError.message)
    return
  }

  if (userEmail) {
    await sendToolAccessDeniedEmail(userEmail, toolSlug)
  }

  revalidatePath('/admin/approvals')
}
