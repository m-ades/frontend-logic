import { useNavigate } from 'react-router-dom'
import { Box, Typography, CardContent, Stack, Button } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        Welcome back
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        ............................
      </Typography>

      <Stack spacing={2}>
        <ThemedCard>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6">Assignments</Typography>
              <Typography variant="body2" color="text.secondary">
                View upcoming and submitted assigments
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/assignments')}>
              View assignments
            </Button>
          </CardContent>
        </ThemedCard>

        <ThemedCard>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6">Practice</Typography>
              <Typography variant="body2" color="text.secondary">
                Sharpen your skills with supplementary problem sets.
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/practice')}>
              Start practice
            </Button>
          </CardContent>
        </ThemedCard>

        <ThemedCard>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6">Grades</Typography>
              <Typography variant="body2" color="text.secondary">
                Track your progress.
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/grades')}>
              View grades
            </Button>
          </CardContent>
        </ThemedCard>
      </Stack>
    </Box>
  )
}
