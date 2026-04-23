interface EmptyStateProps {
  message: string
  detail?: string
}

export function EmptyState({ message, detail }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <p className="eyebrow mb-3">Nothing here</p>
      <p className="display-sm hm-text-muted mb-2">{message}</p>
      {detail && <p className="body-md">{detail}</p>}
    </div>
  )
}
