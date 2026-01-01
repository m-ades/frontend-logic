import { Box, Typography, CardContent, Stack, Divider } from '@mui/material'
import ThemedCard from '../../components/ui/ThemedCard.jsx'

export default function InstructorDashboard() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard
      </Typography>

      <ThemedCard>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">placeholder</Typography>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              placeholder
            </Typography>
          </Stack>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
