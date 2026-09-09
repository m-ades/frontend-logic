import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getAppTheme } from '../theme.js'

const ThemeStateContext = createContext()
const ThemeDispatchContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    return getAppTheme(savedTheme)
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const mode = theme?.palette?.mode === 'dark' ? 'dark' : 'light'
    document.body.dataset.theme = mode
    document.documentElement.dataset.theme = mode
  }, [theme])

  const changeTheme = useCallback((themeName) => {
    localStorage.setItem('theme', themeName)
    setTheme(getAppTheme(themeName))
  }, [])

  return (
    <ThemeStateContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={changeTheme}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeStateContext.Provider>
  )
}

export function useThemeState() {
  const context = useContext(ThemeStateContext)
  if (context === undefined) {
    throw new Error('useThemeState must be used within a ThemeProvider')
  }
  return context
}

export function useThemeDispatch() {
  const context = useContext(ThemeDispatchContext)
  if (context === undefined) {
    throw new Error('useThemeDispatch must be used within a ThemeProvider')
  }
  return context
}
