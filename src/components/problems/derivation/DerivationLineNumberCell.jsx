import { Box, TableCell } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  FITCH_LINE_WIDTH,
  getDerivationNumberCellWidthSx,
  getFitchLineColor,
} from './derivationTableConfig.js'

export default function DerivationLineNumberCell({
  isCompact,
  isFullScreen,
  lineNumber,
  onCite,
  showsFitchLine,
}) {
  return (
    <TableCell
      sx={{
        ...getDerivationNumberCellWidthSx(isCompact),
        borderBottom: 'none',
        px: 0.5,
        textAlign: 'center',
        color: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.78 : 0.7),
        fontWeight: 600,
        verticalAlign: 'middle',
        ...(showsFitchLine && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -1,
            bottom: -1,
            right: -1,
            width: FITCH_LINE_WIDTH,
            borderRadius: 1,
            bgcolor: getFitchLineColor,
            pointerEvents: 'none',
            zIndex: 1,
          },
        }),
        ...(isFullScreen && { pr: 1 }),
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onCite()
        }}
        sx={{
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          fontWeight: 600,
          '&:hover': { textDecoration: 'underline' },
        }}
        title="Add to line(s)"
        aria-label={`Add ${lineNumber} to line(s)`}
      >
        {lineNumber}
      </Box>
    </TableCell>
  )
}
