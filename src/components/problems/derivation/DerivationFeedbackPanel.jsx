import { Box, Typography } from '@mui/material'

export default function DerivationFeedbackPanel({
  autoCheckEnabled,
  autoCheckRows,
  isFullScreen,
  lineGateNotice,
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

      {autoCheckEnabled && (
        <Box sx={{ mt: 2, color: 'text.secondary', ...(isFullScreen && { pl: 2 }) }}>
          {autoCheckRows.length > 0 ? (
            autoCheckRows.map((row, idx) => (
              <Box key={`autocheck-row-${idx}`} sx={{ mb: 1 }}>
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
            ))
          ) : (
            <Typography variant="body2">Autochecker on: no issues detected yet.</Typography>
          )}
        </Box>
      )}
    </>
  )
}
