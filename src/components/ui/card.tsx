import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * HM Card — sharp-cornered, dark surface, 4px left accent border.
 * accentColor controls the left border: 'yellow' | 'blue' | 'pink' | 'dim'
 */

type AccentColor = 'yellow' | 'blue' | 'pink' | 'dim' | 'none'

const accentBorder: Record<AccentColor, string> = {
  yellow: 'border-l-[var(--accent)]',
  blue:   'border-l-[#00B4D8]',
  pink:   'border-l-[var(--pink)]',
  dim:    'border-l-[var(--border-2)]',
  none:   'border-l-transparent',
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor
}

function Card({ className, accent = 'none', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--surface)] border border-[var(--border)] border-l-4',
        accentBorder[accent],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-heading font-black uppercase tracking-wide text-2xl text-[var(--text)]',
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[var(--text-muted)] leading-relaxed mt-2', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-6 pt-0 flex items-center gap-3', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export type { AccentColor }
