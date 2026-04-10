'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? '🌙' : '☀️'
    }
    return theme === 'dark' ? '🌙' : '☀️'
  }

  const getLabel = () => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`
    }
    return theme === 'dark' ? 'Dark' : 'Light'
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      title={`Current: ${getLabel()}. Click to cycle themes.`}
    >
      <span className="text-lg">{getIcon()}</span>
      <span className="hidden sm:inline">{getLabel()}</span>
    </button>
  )
}