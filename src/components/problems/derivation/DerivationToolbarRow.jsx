import {
  Box,
  Button,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
} from '@mui/material'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { getInsertSymbolLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import {
  plainIconButtonSx,
  SYMBOL_BUTTONS,
  symbolBtnSx,
} from './derivationUtils.js'

export default function DerivationToolbarRow({
  addLine,
  autoCheckEnabled,
  canAddLine,
  handleSymbolInsert,
  isFullScreen,
  isMobile,
  isPhone,
  setAutoCheckEnabled,
}) {
  return (
    <TableRow sx={{ '& td': { verticalAlign: 'middle', py: isMobile ? 0.25 : 0.5 } }}>
      <TableCell sx={{ width: isFullScreen || isMobile ? 36 : 48, minWidth: isFullScreen || isMobile ? 36 : undefined, borderBottom: 'none', verticalAlign: 'middle', ...(isFullScreen && { pr: 1 }) }}>
        <Tooltip title="New line">
          <span style={{ display: 'inline-flex' }}>
            <IconButton onClick={addLine} size="small" aria-label="Add line" disabled={!canAddLine} sx={plainIconButtonSx}>
              <SubdirectoryArrowRightIcon />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ borderBottom: 'none', pl: 0.5, verticalAlign: 'middle' }} colSpan={2}>
        <Stack direction="row" alignItems="center" sx={{ overflowX: isFullScreen ? 'hidden' : 'auto', overflowY: 'hidden', py: 0.5, WebkitOverflowScrolling: 'touch' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isFullScreen ? 0.5 : 0.75,
              flexWrap: isFullScreen ? 'wrap' : 'nowrap',
              minWidth: isFullScreen ? 0 : 'max-content',
              pr: isFullScreen ? 0 : 1,
              ...(isPhone && isFullScreen && { flexDirection: 'column', alignItems: 'flex-start' }),
            }}
          >
            {isPhone && isFullScreen ? (
              <Tooltip title={autoCheckEnabled ? 'Turn off autochecker' : 'Turn on autochecker'}>
                <IconButton
                  onClick={() => setAutoCheckEnabled((prev) => !prev)}
                  size="small"
                  aria-label="Toggle autochecker"
                  sx={{ ...plainIconButtonSx, color: autoCheckEnabled ? 'primary.main' : 'text.disabled', position: 'relative' }}
                >
                  <AutoAwesomeIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <Tooltip title={autoCheckEnabled ? 'Turn off autochecker' : 'Turn on autochecker'}>
                  <IconButton
                    onClick={() => setAutoCheckEnabled((prev) => !prev)}
                    size="small"
                    aria-label="Toggle autochecker"
                    sx={{
                      ...plainIconButtonSx,
                      color: autoCheckEnabled ? 'primary.main' : 'text.disabled',
                      position: 'relative',
                    }}
                  >
                    <AutoAwesomeIcon />
                  </IconButton>
                </Tooltip>
                {SYMBOL_BUTTONS.map(({ label, insert, pair }) => (
                  <Button
                    key={label}
                    type="button"
                    size="small"
                    variant="outlined"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSymbolInsert({ insert, pair })}
                    aria-label={getInsertSymbolLabel({ insert, pair })}
                    title={getInsertSymbolLabel({ insert, pair })}
                    sx={symbolBtnSx(isFullScreen, isMobile, isPhone)}
                  >
                    {label}
                  </Button>
                ))}
              </>
            )}
          </Box>
        </Stack>
      </TableCell>
    </TableRow>
  )
}
