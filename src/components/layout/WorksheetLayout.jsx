import { Box, Typography, IconButton, Stack } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockIcon from '@mui/icons-material/Lock'
import { formatEasternFromIso } from '../../utils/easternTime.js'

export default function Layout({ 
  title, 
  subtitle, 
  children, 
  inModal = false,
  onBackToLMS,
  isOverdue,
  isLocked = false,
  dueAt = null,
  originalDueAt = null,
  cutoffAt = null,
  extraFullCreditDays = 0,
  latePenaltyWaived = false,
  showPolicyInfo = false,
}) {
  const dueLabel = dueAt ? formatEasternFromIso(dueAt, { includeTime: true }) : null
  const originalLabel = originalDueAt
    ? formatEasternFromIso(originalDueAt, { includeTime: true })
    : null
  const cutoffLabel = cutoffAt
    ? formatEasternFromIso(cutoffAt, { includeTime: true })
    : null
  const dueTs = dueAt ? Date.parse(dueAt) : NaN
  const originalTs = originalDueAt ? Date.parse(originalDueAt) : NaN
  const hasAdjustedDue = Number.isFinite(dueTs) && Number.isFinite(originalTs) && dueTs !== originalTs
  const extraDays = Number(extraFullCreditDays) || 0
  const policyLines = []
  if (dueLabel) {
    policyLines.push({
      label: hasAdjustedDue ? 'Due (extended)' : 'Due',
      value: dueLabel,
    })
  }
  if (hasAdjustedDue && originalLabel) {
    policyLines.push({ label: 'Original due', value: originalLabel })
  }
  if (extraDays > 0) {
    policyLines.push({
      label: 'Accommodation',
      value: `+${extraDays} full-credit day${extraDays === 1 ? '' : 's'}`,
    })
  }
  if (latePenaltyWaived) {
    policyLines.push({ label: 'Late penalty', value: 'Waived' })
  }
  if (cutoffLabel) {
    policyLines.push({ label: 'Late window until', value: cutoffLabel })
  }
  return (
    <Box sx={{ width: '100%', height: '100%', minWidth: 0, overflowX: 'hidden' }}>

      <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            mb: 1.5,
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
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {subtitle}
                  </Typography>
                  {isLocked && (
                    <LockIcon sx={{ fontSize: '1rem', color: 'text.secondary', flexShrink: 0 }} />
                  )}
                </Stack>
                {showPolicyInfo && policyLines.length > 0 && (
                  <Stack spacing={0.25}>
                    {policyLines.map((line) => (
                      <Typography key={line.label} variant="caption" sx={{ color: 'text.secondary' }}>
                        {line.label}: {line.value}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        </Box>

      </Box>

      <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pt: 0.5, pb: { xs: 1, sm: 2, md: 3 }, minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
        {/* single surface */}
        {children}
      </Box>
    </Box>
  )
}
