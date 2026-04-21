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
    <div
      style={{
        minHeight:      'calc(100vh - var(--nav-h))',
        background:     'var(--bg)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 24px',
        textAlign:      'center',
      }}
    >
      <div className="animate-fade-up" style={{ maxWidth: 480, width: '100%' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Hold up</p>

        <h1
          className="display-lg"
          style={{ color: 'var(--text)', marginBottom: 20 }}
        >
          No<br />
          <span style={{ color: 'var(--pink)', fontStyle: 'italic' }}>Access.</span>
        </h1>

        <p
          style={{
            fontSize:    16,
            color:       'var(--text-muted)',
            lineHeight:  1.65,
            marginBottom: 32,
            maxWidth:    380,
            margin:      '0 auto 32px',
          }}
        >
          {toolLabel
            ? `You don\u2019t have access to ${toolLabel} yet.`
            : `You don\u2019t have permission to view this page. Your account may be pending approval,
               or you haven\u2019t been granted access to this tool.`}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
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
