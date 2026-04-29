import type { ComponentType, ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ToolHeader from '@/components/ToolHeader'

export interface CreateToolLayoutOptions {
  /** URL slug — also used as the data-tool attribute for CSS scoping. */
  toolSlug: string
  /** Display name shown in the tool header. */
  toolName: string
  /**
   * Client-only Provider that wraps children (e.g. WizardProvider).
   * Omit for tools that don't need wizard state.
   */
  Provider?: ComponentType<{ children: ReactNode }>
  /**
   * Sub-nav rendered inside the ToolHeader (e.g. <StepIndicator />).
   * Most wizard tools pass their step indicator here.
   */
  subNav?: ReactNode
  /**
   * Defense-in-depth auth check. proxy.ts already gates page routes; this
   * adds a server-side redirect so the layout never renders for an
   * unapproved user even if the middleware is bypassed.
   */
  requireApproved?: boolean
  /**
   * Render a per-role action slot in the top-right of the tool header
   * (e.g. settings button for admins/editors). Receives the user's role
   * — undefined when no user or no role set.
   */
  resolveActions?: (role: string | undefined) => ReactNode
}

/**
 * Factory for a tool's root layout — handles the data-tool wrapper, optional
 * Provider, ToolHeader, and tool-content slot. Each tool's layout.tsx becomes
 * a one-liner: `export default createToolLayout({...})`.
 */
export function createToolLayout(opts: CreateToolLayoutOptions) {
  return async function ToolLayout({ children }: { children: ReactNode }) {
    let actions: ReactNode = null

    if (opts.requireApproved || opts.resolveActions) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (opts.requireApproved) {
        if (!user) redirect('/login')
        if (user.user_metadata?.status !== 'approved') redirect('/no-access')
      }

      if (opts.resolveActions) {
        const role = user?.user_metadata?.role as string | undefined
        actions = opts.resolveActions(role)
      }
    }

    const shell = (
      <>
        <ToolHeader
          toolName={opts.toolName}
          toolSlug={opts.toolSlug}
          actions={actions ?? undefined}
        >
          {opts.subNav}
        </ToolHeader>
        <div className="tool-content">{children}</div>
      </>
    )

    return (
      <div data-tool={opts.toolSlug}>
        {opts.Provider ? <opts.Provider>{shell}</opts.Provider> : shell}
      </div>
    )
  }
}
