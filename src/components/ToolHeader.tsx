/**
 * ToolHeader — horizontal tab bar sitting below the global nav.
 * Each tool layout passes its name and optional tabs (sections within the tool).
 * Tabs are empty by default; add them as the tool is built out.
 *
 * Usage:
 *   <ToolHeader toolName="Expenses Manager" toolSlug="expenses-manager" />
 *   <ToolHeader toolName="Coverage Tracker" toolSlug="coverage-tracker" tabs={[
 *     { href: '/coverage-tracker', label: 'Overview' },
 *     { href: '/coverage-tracker/reports', label: 'Reports' },
 *   ]} />
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  label: string
}

interface ToolHeaderProps {
  toolName: string
  toolSlug: string
  tabs?: Tab[]
  /**
   * Optional slot rendered in the tab area — use when a tool wants
   * something other than nav links (e.g. a step indicator for a wizard).
   * When provided, `tabs` is ignored.
   */
  children?: React.ReactNode
}

export default function ToolHeader({ toolName, tabs = [], children }: ToolHeaderProps) {
  const pathname = usePathname()

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        alignItems: 'stretch',
        height: 'var(--tool-nav-h)',
        position: 'sticky',
        top: 'var(--nav-h)',
        zIndex: 30,
      }}
    >
      {/* Tool name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderRight: '2px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
          }}
        >
          {toolName}
        </span>
      </div>

      {/* Custom slot (e.g. wizard step indicator) takes precedence over tabs */}
      {children ? (
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {children}
        </div>
      ) : tabs.length > 0 && (
        <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
          {tabs.map(tab => {
            const isActive = tab.href === pathname
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: isActive
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  marginBottom: -2, // align with parent border
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}


    </div>
  )
}
