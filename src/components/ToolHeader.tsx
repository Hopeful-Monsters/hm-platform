'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
  href: string
  label: string
}

interface ToolHeaderProps {
  toolName: string
  toolSlug?: string
  tabs?: Tab[]
  children?: React.ReactNode
  actions?: React.ReactNode
}

export default function ToolHeader({ toolName, tabs = [], children, actions }: ToolHeaderProps) {
  const pathname = usePathname()

  return (
    <div className="tool-header">
      <div className="tool-header-name">
        {toolName}
      </div>

      {children ? (
        <div className="tool-header-center">
          {children}
        </div>
      ) : tabs.length > 0 ? (
        <nav className="tool-header-center" aria-label={`${toolName} navigation`}>
          {tabs.map(tab => {
            const isActive = tab.href === pathname
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'tool-header-tab',
                  isActive && 'tool-header-tab--active'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      ) : (
        <div className="tool-header-center" />
      )}

      {actions && (
        <div className="tool-header-actions">
          {actions}
        </div>
      )}
    </div>
  )
}
