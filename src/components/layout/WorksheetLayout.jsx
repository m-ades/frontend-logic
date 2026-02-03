import { Box, Typography, IconButton, Stack } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockIcon from '@mui/icons-material/Lock'

export default function Layout({ 
  title, 
  subtitle, 
  children, 
  inModal = false,
  onBackToLMS,
  isOverdue,
  isLocked = false,
}) {
  return (
    <Box sx={{ width: '100%', height: '100%', minWidth: 0, overflowX: 'hidden' }}>

      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {onBackToLMS && (
            <IconButton
              onClick={onBackToLMS}
              aria-label="Back to dashboard"
              sx={{
                color: 'text.secondary',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 500, mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {subtitle}
                </Typography>
                {isLocked && (
                  <LockIcon sx={{ fontSize: '1rem', color: 'text.secondary', flexShrink: 0 }} />
                )}
              </Stack>
            )}
          </Box>
        </Box>

      </Box>

      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
        {/* single surface */}
        {children}
      </Box>
    </Box>
  )
}
