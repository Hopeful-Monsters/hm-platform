import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import RequestAccessButton from '@/components/RequestAccessButton'
import { TOOL_LABEL, TOOL_SLUGS, type ToolSlug } from '@/lib/tools'

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tool } = await searchParams

  // `?tool` is only set by the middleware when an *approved* user lacks tool_access.
  // If it's absent, the user's account is pending/blocked — show the generic message.
  const toolSlug = typeof tool === 'string' && TOOL_SLUGS.includes(tool) ? tool : null
  const toolLabel = toolSlug ? TOOL_LABEL[toolSlug as ToolSlug] : null

  // We need auth state to confirm approval before rendering the request button.
  // This prevents a non-approved user from seeing the request UI if they land
  // here directly with a forged ?tool param.
  let isApproved = false
  if (toolSlug) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    isApproved = user?.user_metadata?.status === 'approved'
  }

  return (
    <div className="auth-page-shell">
      <div className="animate-fade-up auth-card text-center">
        <p className="eyebrow mb-3">Hold up</p>

        <h1 className="display-lg hm-text mb-5">
          No<br />
          <span className="hm-pink italic">Access.</span>
        </h1>

        <p className="hm-text-muted hm-no-access-body">
          {toolLabel
            ? `You don\u2019t have access to ${toolLabel} yet.`
            : `You don\u2019t have permission to view this page. Your account may be pending approval,
               or you haven\u2019t been granted access to this tool.`}
        </p>

        <div className="hm-action-row">
          {toolSlug && isApproved && toolLabel ? (
            <>
              <RequestAccessButton
                toolSlug={toolSlug}
                toolLabel={toolLabel}
              />
              <Button asChild variant="outline" size="lg">
                <Link href="/">Go Home</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/">Go Home →</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
