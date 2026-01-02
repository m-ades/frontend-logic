import { Box, Typography, CardContent, Stack, Divider } from '@mui/material'
import ThemedCard from '../../components/ui/ThemedCard.jsx'

export default function InstructorControls() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Controls
      </Typography>

      <ThemedCard>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Coming soon</Typography>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              placeholder for student and classroom-level extensions, late window overrides,
              assigment unlocking, etc
            </Typography>
          </Stack>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
