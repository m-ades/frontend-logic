import React from 'react'
import { Box, Typography, IconButton, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
// import DownloadIcon from '@mui/icons-material/Download'
import RulesReference from '../ui/RulesReference.jsx'
import Widget from '../ui/Widget.jsx'
import PageTitle from '../ui/PageTitle.jsx'

export default function Layout({ 
  title, 
  subtitle, 
  score, 
  total, 
  gradePercent,
  dueDate,
  scoreStyle, 
  currentProofId, 
  completedProofs, 
  children, 
  worksheets, 
  currentWorksheetIndex, 
  onWorksheetIndexChange, 
  onExportClick, 
  onBackToLMS, 
  inModal = false 
}) {
  const completionPercent = total > 0 ? Math.round((score / total) * 100) : 0
  const gradeLabel = Number.isFinite(gradePercent)
    ? `${gradePercent.toFixed(1)}%`
    : '—'
  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false
  
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

        {/* Commented out export PDF and assignment dropdown - temporarily removed */}
        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            {isOverdue && (
              <Chip
                label="Past due"
                color="error"
                size="small"
                sx={{ fontWeight: 600, height: 28 }}
              />
            )}
          </Stack>
          
          {onExportClick && (
            <Tooltip title="Export answers to PDF">
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={onExportClick}
                sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
              >
                Export PDF
              </Button>
            </Tooltip>
          )}
          
          {worksheets && (
            <FormControl 
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 200 }, width: { xs: '100%', sm: 'auto' } }}
            >
              <Select
                value={currentWorksheetIndex}
                onChange={(e) => {
                  onWorksheetIndexChange(e.target.value)
                  handleClose()
                }}
                open={dropdownOpen}
                onOpen={handleOpen}
                onClose={handleClose}
                displayEmpty
                sx={{
                  textTransform: 'none',
                }}
              >
                {worksheets.map((worksheet, idx) => {
                  const worksheetCompleted = worksheet.proofs.length > 0
                    ? worksheet.proofs.every((p) => completedProofs.has(p.id))
                    : false
                  return (
                    <MenuItem key={worksheet.id} value={idx}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {worksheet.title}
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
        </Box> */}
      </Box>

      <Box>
        <Widget noBodyPadding>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {React.cloneElement(children, {
              gradePercent,
              total,
              score,
              dueDate,
              completionPercent,
              gradeLabel,
              isOverdue
            })}
          </Box>
        </Widget>
      </Box>
    </Box>
  )
}
