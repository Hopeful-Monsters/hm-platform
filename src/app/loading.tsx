export default function Loading() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--nav-h))',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          className="spin"
          style={{
            width: 40,
            height: 40,
            borderWidth: 4,
            borderColor: 'var(--accent)',
            borderTopColor: 'transparent',
            margin: '0 auto 20px',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
          }}
        >
          Loading…
        </p>
      </div>
    </div>
  )
}