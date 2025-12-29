import { IconButton, Tooltip } from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeDispatch } from '../../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const themeDispatch = useThemeDispatch()

  const toggleDarkTheme = () => {
    const currentTheme = localStorage.getItem('theme') || 'default'
    const newTheme = currentTheme === 'dark' ? 'default' : 'dark'
    localStorage.setItem('theme', newTheme)
    themeDispatch(newTheme)
  }

  const isDark = localStorage.getItem('theme') === 'dark'

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton color="inherit" onClick={toggleDarkTheme} aria-label="toggle dark mode">
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
