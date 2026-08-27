import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

export default function DerivationFeedbackPanel({
  autoCheckEnabled,
  autoCheckRows,
  isFullScreen,
  lineGateNotice,
  onToggleAutoCheck,
}) {
  return (
    <>
      {lineGateNotice.message && (
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            color: lineGateNotice.tone === 'success' ? 'success.main' : 'error.main',
            ...(isFullScreen && { pl: 2 }),
          }}
        >
          {lineGateNotice.message}
        </Typography>
      )}

      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'flex-start', gap: 0.5, ...(isFullScreen && { pl: 2 }) }}>
        <Tooltip title={`${autoCheckEnabled ? 'Turn off' : 'Turn on'} autochecker`}>
          <IconButton
            onClick={onToggleAutoCheck}
            size="small"
            aria-label="Toggle autochecker"
            sx={{ p: 0.25, mt: -0.25, color: autoCheckEnabled ? 'primary.main' : 'text.disabled' }}
          >
            <AutoAwesomeIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ minWidth: 0, color: 'text.secondary' }}>
          {!autoCheckEnabled ? (
            <Typography variant="body2">Autochecker off.</Typography>
          ) : autoCheckRows.length === 0 ? (
            <Typography variant="body2">Autochecker: no issues.</Typography>
          ) : autoCheckRows.map((row, idx) => (
            <Box key={`autocheck-row-${idx}`} sx={{ mb: idx < autoCheckRows.length - 1 ? 1 : 0 }}>
              {row.line && row.line !== '??' && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Line {row.line}
                </Typography>
              )}
              {row.entries.map((entry, entryIdx) => (
                <Typography key={`autocheck-entry-${idx}-${entryIdx}`} variant="body2">
                  <strong>{entry.label}:</strong> {entry.messages.join('; ')}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </>
  )
}
