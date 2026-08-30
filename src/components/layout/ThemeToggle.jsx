import { IconButton, Tooltip } from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeDispatch, useThemeState } from '../../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const themeDispatch = useThemeDispatch()
  const theme = useThemeState()
  const isDark = theme.palette.mode === 'dark'

  const toggleDarkTheme = () => {
    themeDispatch(isDark ? 'default' : 'dark')
  }

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton color="inherit" onClick={toggleDarkTheme} aria-label="toggle dark mode">
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
