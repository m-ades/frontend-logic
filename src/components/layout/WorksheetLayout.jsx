import { Box, Typography, IconButton, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RulesReference from '../ui/RulesReference.jsx'

export default function Layout({ 
  title, 
  subtitle, 
  children, 
  inModal = false,
  onBackToLMS,
  isOverdue,
}) {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {!inModal && <RulesReference />}

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
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {isOverdue && (
          <Box sx={{ mb: 2 }}>
            {/* past due only */}
            <Chip
              label="Past due"
              color="error"
              size="small"
              sx={{ fontWeight: 600, height: 28 }}
            />
          </Box>
        )}
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* single surface */}
        {children}
      </Box>
    </Box>
  )
}
