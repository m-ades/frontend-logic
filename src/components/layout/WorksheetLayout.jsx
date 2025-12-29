import { useState } from 'react'
import { Box, Grid, Typography, Tooltip, Select, MenuItem, FormControl, IconButton, Button, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DownloadIcon from '@mui/icons-material/Download'
import RulesReference from '../ui/RulesReference.jsx'
import Widget from '../ui/Widget.jsx'
import PageTitle from '../ui/PageTitle.jsx'

export default function Layout({ 
  title, 
  subtitle, 
  score, 
  total, 
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia && window.matchMedia('(hover: none)').matches
  })
  const handleOpen = () => setDropdownOpen(true)
  const handleClose = () => setDropdownOpen(false)
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {!inModal && <RulesReference />}
      
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          {onBackToLMS && (
            <IconButton
              onClick={onBackToLMS}
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={`${score} / ${total}`}
            color={score === total && total > 0 ? 'success' : 'default'}
            icon={score === total && total > 0 ? <CheckCircleIcon /> : undefined}
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              height: 32,
            }}
          />
          
          {onExportClick && (
            <Tooltip title="Export answers to PDF">
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={onExportClick}
                sx={{ textTransform: 'none' }}
              >
                Export PDF
              </Button>
            </Tooltip>
          )}
          
          {worksheets && (
            <FormControl 
              size="small"
              sx={{ minWidth: 200 }}
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
                  const worksheetCompleted = worksheet.proofs.every(p => completedProofs.has(p.id))
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
        </Box>
      </Box>

      <Box>
        <Widget>
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        </Widget>
      </Box>
    </Box>
  )
}
