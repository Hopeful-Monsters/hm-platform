export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-12 text-[var(--text-dim)]"
      role="status"
      aria-label={label}
    >
      <span className="spin inline-block w-5 h-5 border-2 border-[var(--border-2)] border-t-[var(--accent)] rounded-full" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
