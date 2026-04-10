'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        background: 'none',
        border: '2px solid var(--border-2)',
        color: 'var(--text-muted)',
        padding: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s, color 0.15s',
        borderRadius: 0,
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--accent)'
        el.style.color = 'var(--accent)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--border-2)'
        el.style.color = 'var(--text-muted)'
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
