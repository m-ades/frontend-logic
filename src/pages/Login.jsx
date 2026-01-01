import { Box, Typography, CardContent } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'

export default function Login() {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Login
      </Typography>

      <ThemedCard>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            placeholder
          </Typography>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
