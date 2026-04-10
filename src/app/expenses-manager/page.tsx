export default function ExpensesManagerPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - var(--nav-h) - var(--tool-nav-h))',
        padding: '64px 32px',
        textAlign: 'center',
      }}
    >
      <p className="eyebrow" style={{ marginBottom: 12 }}>Coming soon</p>
      <h1
        className="display-lg"
        style={{ color: 'var(--text)', marginBottom: 16 }}
      >
        Expenses<br />
        <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Manager.</span>
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'var(--text-muted)',
          lineHeight: 1.65,
          maxWidth: 400,
        }}
      >
        This tool is in development. The shell and access controls are in place —
        the expense tracking interface will live here.
      </p>
    </div>
  )
}
