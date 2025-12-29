import { Box, Typography, CardContent, Stack, Avatar, Chip } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { Person as PersonIcon } from '@mui/icons-material'

export default function Contact() {
  // stub data - will be replaced with backend
  const contactRequests = []

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Contact Staff
      </Typography>

      <Stack spacing={2}>
        {contactRequests.length === 0 ? (
          <ThemedCard>
            <CardContent>
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                implement
              </Typography>
            </CardContent>
          </ThemedCard>
        ) : (
          contactRequests.map((message, idx) => (
            <ThemedCard key={idx}>
              <CardContent>
                <Stack direction="row" spacing={2}>
                  <Avatar>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Typography variant="h6">{message.from}</Typography>
                      <Chip label={message.date} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {message.subject}
                    </Typography>
                    <Typography variant="body2">{message.body}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </ThemedCard>
          ))
        )}
      </Stack>
    </Box>
  )
}
