import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * HM Button — sharp-cornered, Barlow Condensed, three variants:
 *   default  — yellow fill, offset shadow on hover
 *   outline  — yellow border, fills yellow on hover
 *   ghost    — no border, muted text, subtle bg on hover
 */
const buttonVariants = cva(
  [
    'btn-hm',
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
    'disabled:opacity-40 disabled:pointer-events-none',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--accent)] text-[var(--accent-fg)]',
          'hover:outline hover:outline-2 hover:outline-[var(--text)]',
        ].join(' '),
        outline: [
          'bg-transparent text-[var(--accent)]',
          'border-2 border-[var(--accent)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]',
        ].join(' '),
        ghost: [
          'bg-transparent text-[var(--text-muted)]',
          'hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        ].join(' '),
        danger: [
          'bg-red-600 text-white',
          'hover:outline hover:outline-2 hover:outline-[var(--text)]',
        ].join(' '),
        nav: [
          'bg-transparent text-[var(--text-dim)]',
          'border-2 border-[var(--border-2)]',
          'hover:border-[var(--text)] hover:text-[var(--text)]',
        ].join(' '),
      },
      size: {
        sm:      'text-base px-5 py-2',
        default: 'text-xl px-8 py-3',
        lg:      'text-2xl px-10 py-4',
        icon:    'w-10 h-10 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
