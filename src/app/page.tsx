import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title:       'Hopeful Monsters',
  description: 'A curated set of internal tools for expenses, coverage tracking, and administrative workflows — built for teams that move fast.',
  openGraph: {
    title:       'Hopeful Monsters',
    description: 'A curated set of internal tools for expenses, coverage tracking, and administrative workflows — built for teams that move fast.',
    type:        'website',
  },
}
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import SignOutButton from '@/components/SignOutButton'
import RequestAccessButton from '@/components/RequestAccessButton'
import { TOOLS } from '@/lib/tools'

// ── Tool card ─────────────────────────────────────────────────────
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
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        className="card-hover"
        style={{
          background: 'var(--surface)',
          borderLeft: '4px solid var(--accent)',
          border: '2px solid var(--border)',
          borderLeftWidth: 4,
          borderLeftColor: 'var(--accent)',
          padding: '32px 28px',
          height: '100%',
        }}
      >
        <p className="eyebrow" style={{ marginBottom: 12 }}>Tool</p>
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 30,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            lineHeight: 0.95,
            marginBottom: 12,
          }}
        >
          {label}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            marginBottom: 24,
          }}
        >
          {description}
        </p>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}
        >
          {cta} →
        </span>
      </div>
    </Link>
  )
}

// ── Tool grid skeleton — shown while ToolGrid streams in ──────────
function ToolGridSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 2,
      }}
    >
      {[0, 1].map(i => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderLeftWidth: 4,
            borderLeftColor: 'var(--border)',
            padding: '32px 28px',
            height: 220,
            opacity: 0.5,
          }}
          aria-hidden
        />
      ))}
    </div>
  )
}

// ── Async tool grid — streams in independently ────────────────────
// Isolated here so the welcome hero above renders immediately while
// the two DB queries (tool_access + tool_access_requests) are in flight.
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 2,
      }}
    >
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
          <div
            key={tool.slug}
            style={{
              background:      'var(--surface)',
              border:          '2px solid var(--border)',
              borderLeftWidth: 4,
              borderLeftColor: 'var(--border-2)',
              padding:         '32px 28px',
              opacity:         0.75,
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
              No access
            </p>
            <h3
              style={{
                fontFamily:    'var(--font-heading)',
                fontWeight:    900,
                fontSize:      30,
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                color:         'var(--text-muted)',
                lineHeight:    0.95,
                marginBottom:  12,
              }}
            >
              {tool.label}
            </h3>
            <p
              style={{
                fontSize:     14,
                color:        'var(--text-muted)',
                lineHeight:   1.65,
                marginBottom: 24,
                opacity:      0.7,
              }}
            >
              {tool.description}
            </p>
            <RequestAccessButton
              toolSlug={tool.slug}
              toolLabel={tool.label}
              alreadyRequested={isPending}
            />
          </div>
        )
      })}

      {role === 'admin' && (
        <Link href="/admin" style={{ textDecoration: 'none', display: 'block' }}>
          <div
            className="card-hover"
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              borderLeft: '4px solid var(--pink)',
              padding: '32px 28px',
              height: '100%',
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 12 }}>Admin only</p>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 30,
                textTransform: 'uppercase',
                color: 'var(--text)',
                lineHeight: 0.95,
                marginBottom: 12,
              }}
            >
              Admin Dashboard
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 24 }}>
              Manage users, approve requests, and control tool access.
            </p>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--pink)',
              }}
            >
              Open →
            </span>
          </div>
        </Link>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default async function Home() {
  // getCurrentUser() is memoised via React cache() — the call in layout.tsx
  // already resolved this; we get the cached result with no extra round-trip.
  const user   = await getCurrentUser()
  const status = user?.user_metadata?.status
  const role   = user?.user_metadata?.role

  // ── Unauthenticated landing ──────────────────────────────────────
  if (!user) {
    return (
      <>
        {/* Hero — yellow */}
        <section
          style={{
            background: 'var(--accent)',
            padding: '80px 32px 64px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
            <h1
              className="display-xl"
              style={{ color: 'var(--accent-fg)', marginBottom: 24 }}
            >
              Tools for<br />
              <span
                style={{
                  WebkitTextStroke: '3px var(--accent-fg)',
                  color: 'transparent',
                  fontStyle: 'italic',
                }}
              >
                bold
              </span>{' '}brands.
            </h1>

            <p
              style={{
                fontSize: 18,
                color: 'rgba(0,0,0,0.65)',
                lineHeight: 1.6,
                maxWidth: 460,
                marginBottom: 36,
                fontWeight: 500,
              }}
            >
              A curated set of tools for expenses, coverage tracking, and
              administrative workflows — built for teams that move fast.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
              <Button asChild size="lg" style={{ background: 'var(--accent-fg)', color: 'var(--accent)' }}>
                <Link href="/auth/signup">Get Started →</Link>
              </Button>
              <Button
                asChild
                size="lg"
                style={{
                  background: 'transparent',
                  border: '2px solid var(--accent-fg)',
                  color: 'var(--accent-fg)',
                }}
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>

            {/* Tools carousel */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {TOOLS.map(tool => (
                <div
                  key={tool.slug}
                  style={{
                    flexShrink: 0,
                    width: 260,
                    background: 'rgba(0,0,0,0.08)',
                    border: '2px solid rgba(0,0,0,0.12)',
                    borderLeftWidth: 4,
                    borderLeftColor: 'rgba(0,0,0,0.25)',
                    padding: '20px 20px 22px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: 'rgba(0,0,0,0.45)',
                      marginBottom: 8,
                    }}
                  >
                    Tool
                  </p>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      fontSize: 22,
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                      color: 'var(--accent-fg)',
                      lineHeight: 0.95,
                      marginBottom: 10,
                    }}
                  >
                    {tool.label}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'rgba(0,0,0,0.55)',
                      lineHeight: 1.55,
                    }}
                  >
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    )
  }

  // ── Pending approval ────────────────────────────────────────────
  if (status !== 'approved') {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - var(--nav-h))',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div className="animate-fade-up" style={{ maxWidth: 480 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Almost there</p>
          <h1
            className="display-lg"
            style={{ color: 'var(--text)', marginBottom: 20 }}
          >
            Pending<br />
            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Approval.</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'var(--text-muted)',
              lineHeight: 1.65,
              marginBottom: 32,
            }}
          >
            Your account has been created. An admin will review and approve your access
            shortly — you&rsquo;ll receive an email when you&rsquo;re in.
          </p>
          <SignOutButton />
        </div>
      </div>
    )
  }

  // ── Approved dashboard ──────────────────────────────────────────
  // Welcome hero renders immediately. ToolGrid is in a Suspense boundary so
  // the hero appears as part of the static shell while the two DB queries
  // (tool_access + tool_access_requests) stream in concurrently.
  return (
    <>
      {/* Welcome hero — renders before ToolGrid queries resolve */}
      <section
        style={{
          background: 'var(--accent)',
          padding: '48px 32px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          className="watermark"
          style={{
            fontSize: '30vw',
            lineHeight: 1,
            color: 'rgba(0,0,0,0.045)',
            bottom: -30,
            right: -10,
          }}
        >
          HM
        </span>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="eyebrow" style={{ marginBottom: 8, color: 'rgba(0,0,0,0.45)' }}>
            Your dashboard
          </p>
          <h1
            className="display-lg"
            style={{ color: 'var(--accent-fg)', lineHeight: 0.9 }}
          >
            Welcome back,<br />
            {user.email?.split('@')[0]}.
          </h1>
        </div>
      </section>

      {/* Tool grid — streams in after tool_access queries resolve */}
      <section
        style={{
          background: 'var(--bg)',
          padding: '48px 32px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <p className="eyebrow" style={{ marginBottom: 20 }}>Your tools</p>
        <Suspense fallback={<ToolGridSkeleton />}>
          <ToolGrid userId={user.id} role={role} />
        </Suspense>
      </section>
    </>
  )
}
