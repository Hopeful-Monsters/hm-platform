import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NoAccessPage() {
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
            fontSize: 16,
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            marginBottom: 32,
            maxWidth: 380,
            margin: '0 auto 32px',
          }}
        >
          You don&rsquo;t have permission to view this page. Your account may be pending approval,
          or you haven&rsquo;t been granted access to this tool.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button asChild size="lg">
            <Link href="/">Go Home →</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
