'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  // Read localStorage synchronously during first render (safe: ThemeProvider is client-only)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    const saved = localStorage.getItem('hm-theme') as Theme | null
    return saved === 'light' || saved === 'dark' ? saved : defaultTheme
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Standard hydration guard — setState after mount is intentional here.
    // eslint-disable-next-line -- react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Apply class to <html> and persist
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('hm-theme', theme)
  }, [theme, mounted])

  // Prevent flash on initial render — apply default class server-side via script
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('hm-theme')||'${defaultTheme}';document.documentElement.classList.add(t)})()`,
          }}
        />
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
