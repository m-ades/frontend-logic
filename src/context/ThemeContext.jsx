import { createContext, useContext, useEffect, useState } from 'react'
import { createTheme } from '@mui/material/styles'
import defaultThemeConfig from '../themes/default.js'
import darkThemeConfig from '../themes/dark.js'
import { getOverrides } from '../themes/overrides.js'

const ThemeStateContext = createContext()
const ThemeDispatchContext = createContext()

const createAppTheme = (isDark) => {
  const baseTheme = isDark ? darkThemeConfig : defaultThemeConfig
  const overrides = getOverrides(isDark)
  return createTheme({ ...baseTheme, ...overrides })
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'default'
    return createAppTheme(savedTheme === 'dark')
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const mode = theme?.palette?.mode === 'dark' ? 'dark' : 'light'
    document.body.dataset.theme = mode
    document.documentElement.dataset.theme = mode
  }, [theme])

  const changeTheme = (themeName) => {
    localStorage.setItem('theme', themeName)
    setTheme(createAppTheme(themeName === 'dark'))
  }

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
