import { Box, Typography, IconButton, Chip, Stack, FormControl, Select, MenuItem } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RulesReference from '../ui/RulesReference.jsx'
import Widget from '../ui/Widget.jsx'

export default function Layout({ 
  title, 
  subtitle, 
  children, 
  inModal = false,
  onBackToLMS,
  worksheets,
  currentWorksheetIndex,
  onWorksheetIndexChange,
  completedProofs,
  isOverdue,
}) {
  const showWorksheetSelect = Array.isArray(worksheets) && worksheets.length > 1
  const completedSet = completedProofs ?? new Set()
  // guard bad index
  const activeIndex = Number.isFinite(currentWorksheetIndex) && currentWorksheetIndex >= 0
    ? currentWorksheetIndex
    : 0

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

        {(isOverdue || showWorksheetSelect) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: 2 }}
          >
            {isOverdue && (
              <Chip
                label="Past due"
                color="error"
                size="small"
                sx={{ fontWeight: 600, height: 28 }}
              />
            )}
            {showWorksheetSelect && (
              <FormControl
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 240 }, width: { xs: '100%', sm: 'auto' } }}
              >
                <Select
                  value={activeIndex}
                  onChange={(event) => onWorksheetIndexChange?.(event.target.value)}
                  displayEmpty
                  sx={{ textTransform: 'none' }}
                >
                  {worksheets.map((worksheet, idx) => {
                    // show done mark
                    const worksheetCompleted = worksheet.proofs?.length
                      ? worksheet.proofs.every((p) => completedSet.has(p.id))
                      : false
                    return (
                      <MenuItem key={worksheet.id} value={idx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {worksheet.title || `Assignment ${idx + 1}`}
                          </Typography>
                          {worksheetCompleted && (
                            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                          )}
                        </Box>
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
            )}
          </Stack>
        )}
      </Box>

      <Box>
        <Widget noBodyPadding>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {children}
          </Box>
        </Widget>
      </Box>
    </Box>
  )
}
