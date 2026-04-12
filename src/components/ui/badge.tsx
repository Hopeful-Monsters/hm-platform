import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * HM Badge — sharp-cornered status labels.
 * Matches the editorial badge pattern from the design reference.
 */

type BadgeVariant = 'approved' | 'pending' | 'admin' | 'neutral' | 'pink'

const badgeStyles: Record<BadgeVariant, string> = {
  approved: 'bg-[#1a1600] text-[var(--accent)] dark:bg-[#1a1600]',
  pending:  'bg-[#1a1a0a] text-[#888] dark:bg-[#1a1a0a]',
  admin:    'bg-[#001820] text-[#00B4D8] dark:bg-[#001820]',
  pink:     'bg-[#1a0018] text-[var(--pink)] dark:bg-[#1a0018]',
  neutral:  'bg-[var(--surface-2)] text-[var(--text-muted)]',
}


interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block font-heading font-700 text-xs tracking-widest uppercase px-2.5 py-1',
        badgeStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeVariant }
