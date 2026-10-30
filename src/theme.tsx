import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const KEY = 'farm.theme'
export type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null)

function storedTheme(): Theme {
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(storedTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function ThemeSwitch() {
  const context = useContext(ThemeContext)
  if (!context) return null
  const { theme, setTheme } = context
  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      <button type="button" className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
        Light
      </button>
      <button type="button" className={theme === 'dark' ? 'on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
        Dark
      </button>
    </div>
  )
}
