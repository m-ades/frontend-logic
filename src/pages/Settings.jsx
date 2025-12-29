import { Box, Typography, CardContent, Stack, Switch, FormControlLabel, Divider } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { useThemeState, useThemeDispatch } from '../context/ThemeContext.jsx'

export default function Settings() {
  const theme = useThemeState()
  const changeTheme = useThemeDispatch()
  const isDark = theme.palette.mode === 'dark'

  const handleThemeToggle = () => {
    changeTheme(isDark ? 'default' : 'dark')
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <ThemedCard>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">Appearance</Typography>
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={isDark}
                  onChange={handleThemeToggle}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
          </Stack>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
