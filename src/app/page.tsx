import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import RequestAccessButton from '@/components/RequestAccessButton'
import { LoadingSpinner } from '@/components/tool/LoadingSpinner'
import { TOOLS } from '@/lib/tools'

export const metadata: Metadata = {
  title:       'Hopeful Monsters',
  description: 'A curated set of internal tools for expenses, coverage tracking, and administrative workflows — built for teams that move fast.',
  openGraph: {
    title:       'Hopeful Monsters',
    description: 'A curated set of internal tools for expenses, coverage tracking, and administrative workflows — built for teams that move fast.',
    type:        'website',
  },
}

function ToolCard({
  href,
  label,
  description,
  cta,
}: {
  href: string
  label: string
  description: string
  cta: string
}) {
  return (
    <Link href={href} className="tool-card card-hover">
      <p className="eyebrow mb-3">Tool</p>
      <h3 className="tool-card-label">{label}</h3>
      <p className="tool-card-desc">{description}</p>
      <span className="tool-card-cta">{cta} →</span>
    </Link>
  )
}

function ToolGridSkeleton() {
  return (
    <div className="tool-grid">
      {[0, 1].map(i => (
        <div
          key={i}
          className="bg-[var(--surface)] border-2 border-[var(--border)] border-l-4 border-l-[var(--border)] p-8 h-[220px] opacity-50"
          aria-hidden
        />
      ))}
    </div>
  )
}

async function ToolGrid({ userId, role }: { userId: string; role?: string }) {
  const supabase = await createClient()

  const [{ data: toolAccess }, { data: accessRequests }] = await Promise.all([
    supabase.from('tool_access').select('tool_slug').eq('user_id', userId),
    supabase
      .from('tool_access_requests')
      .select('tool_slug')
      .eq('user_id', userId)
      .eq('status', 'pending'),
  ])

  const userTools       = toolAccess?.map(a => a.tool_slug) ?? []
  const pendingRequests = accessRequests?.map(r => r.tool_slug) ?? []

  return (
    <div className="tool-grid">
      {TOOLS.map(tool => {
        const hasAccess = userTools.includes(tool.slug)
        if (hasAccess) {
          return (
            <ToolCard
              key={tool.slug}
              href={`/${tool.slug}`}
              label={tool.label}
              description={tool.description}
              cta="Open"
            />
          )
        }
        const isPending = pendingRequests.includes(tool.slug)
        return (
          <div key={tool.slug} className="tool-card--locked">
            <p className="eyebrow mb-3 hm-text-muted">No access</p>
            <h3 className="tool-card-label hm-text-muted">{tool.label}</h3>
            <p className="tool-card-desc opacity-70 mb-6">{tool.description}</p>
            <RequestAccessButton
              toolSlug={tool.slug}
              toolLabel={tool.label}
              alreadyRequested={isPending}
            />
          </div>
        )
      })}

      {role === 'admin' && (
        <Link href="/admin" className="tool-card card-hover tool-card--pink">
          <p className="eyebrow mb-3">Admin only</p>
          <h3 className="tool-card-label">Admin Dashboard</h3>
          <p className="tool-card-desc mb-6">Manage users, approve requests, and control tool access.</p>
          <span className="tool-card-cta">Open →</span>
        </Link>
      )}
    </div>
  )
}

export default async function Home() {
  const user   = await getCurrentUser()
  const status = user?.user_metadata?.status
  const role   = user?.user_metadata?.role

  if (!user) {
    return (
      <div className="hero-landing">
        <section className="hero-landing-inner">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-[1200px] mx-auto">
            <div>
              <h1 className="display-xl hm-accent-fg mb-6">
                Tools for<br />
                <span className="text-outline-on-accent">bold</span> brands.
              </h1>
              <p className="text-lg text-black/65 leading-relaxed max-w-[420px] mb-9 font-medium">
                A curated set of tools for expenses, coverage tracking, and
                administrative workflows — built for teams that move fast.
              </p>
              <div className="hero-cta-row">
                <Link href="/signup" className="btn-hm text-2xl px-10 py-4 hero-cta-primary">
                  Get Started →
                </Link>
                <Link href="/login" className="btn-hm text-2xl px-10 py-4 hero-cta-ghost">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              {TOOLS.map(tool => (
                <div key={tool.slug} className="hero-preview-card">
                  <p className="hero-preview-eyebrow">Tool</p>
                  <h3 className="hero-preview-title">{tool.label}</h3>
                  <p className="hero-preview-desc">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (status !== 'approved') {
    return (
      <div className="auth-page-shell">
        <div className="animate-fade-up text-center max-w-[480px]">
          <p className="eyebrow mb-3">Almost there</p>
          <h1 className="display-lg hm-text mb-5">
            Pending<br />
            <span className="hm-accent italic">Approval.</span>
          </h1>
          <p className="pending-body">
            Your account has been created. An admin will review and approve your access
            shortly — you&rsquo;ll receive an email when you&rsquo;re in.
          </p>
          <SignOutButton />
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="dashboard-hero">
        <span className="watermark-hero" aria-hidden>HM</span>
        <div className="dashboard-hero-inner">
          <p className="dashboard-hero-eyebrow">Your dashboard</p>
          <h1 className="display-lg hm-accent-fg">
            Welcome back,<br />
            {user.email?.split('@')[0]}.
          </h1>
        </div>
      </section>

      <section className="tools-section">
        <p className="eyebrow mb-5">Your tools</p>
        <Suspense fallback={<ToolGridSkeleton />}>
          <ToolGrid userId={user.id} role={role} />
        </Suspense>
      </section>
    </>
  )
}
