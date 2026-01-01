import { Box, Typography, CardContent, Stack, TextField, Button } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'

export default function Login() {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Login
      </Typography>

      <ThemedCard>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Username" fullWidth />
            <TextField label="Password" type="password" fullWidth />
            <Button variant="contained" size="large">
              Sign in
            </Button>
          </Stack>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
