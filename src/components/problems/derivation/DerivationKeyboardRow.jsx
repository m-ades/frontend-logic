import { Box, Button, IconButton, Stack, TableCell, TableRow, Tooltip } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import { getInsertSymbolLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import {
  DERIVATION_NUMBER_CELL_WIDTH_DESKTOP,
  DERIVATION_NUMBER_CELL_WIDTH_MOBILE,
  symbolButtonSx,
} from './derivationTableConfig.js'

export default function DerivationKeyboardRow({
  autoCheckEnabled,
  canAddLine,
  isFullScreen,
  isMobile,
  isPhone,
  mobileLogicKeyboardEnabled,
  onAddLine,
  onInsert,
  onToggleAutoCheck,
  symbolButtons,
  showEditingControls = true,
}) {
  const compactMobileKeyboard = isPhone && isFullScreen && mobileLogicKeyboardEnabled
  const numberWidth = isFullScreen || isMobile
    ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE
    : DERIVATION_NUMBER_CELL_WIDTH_DESKTOP

  return (
    <TableRow sx={{ '& td': { verticalAlign: 'middle', py: isMobile ? 0.25 : 0.5 } }}>
      <TableCell sx={{ width: numberWidth, minWidth: isFullScreen || isMobile ? numberWidth : undefined, borderBottom: 'none', px: 0.5, textAlign: 'center' }}>
        {showEditingControls && (
          <Tooltip title="New line">
            <span style={{ display: 'inline-flex' }}>
              <IconButton onClick={onAddLine} size="small" aria-label="Add line" disabled={!canAddLine}>
                <SubdirectoryArrowRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </TableCell>
      <TableCell sx={{ borderBottom: 'none', pl: 0.5 }} colSpan={2}>
        <Stack direction="row" alignItems="center" sx={{ overflowX: isFullScreen ? 'hidden' : 'auto', overflowY: 'hidden', py: 0.5, WebkitOverflowScrolling: 'touch' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: mobileLogicKeyboardEnabled ? 'center' : 'flex-start',
              gap: isFullScreen ? 0.5 : 0.75,
              minWidth: isFullScreen ? 0 : 'max-content',
              width: isPhone && isFullScreen ? '100%' : undefined,
              pr: isFullScreen ? 0 : 1,
              ...(compactMobileKeyboard && { flexDirection: 'column', alignItems: 'flex-start' }),
            }}
          >
            <Tooltip title={`${autoCheckEnabled ? 'Turn off' : 'Turn on'} autochecker`}>
              <IconButton
                onClick={onToggleAutoCheck}
                size="small"
                aria-label="Toggle autochecker"
                sx={{ color: autoCheckEnabled ? 'primary.main' : 'text.disabled', position: 'relative' }}
              >
                <AutoAwesomeIcon />
              </IconButton>
            </Tooltip>
            {!compactMobileKeyboard && showEditingControls && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: isFullScreen ? 0.5 : 0.75, flexWrap: isFullScreen ? 'wrap' : 'nowrap', minWidth: 0, flex: 1 }}>
                {symbolButtons.map(({ label, insert, pair }) => (
                  <Button
                    key={label}
                    type="button"
                    size="small"
                    variant="outlined"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onInsert({ insert, pair })}
                    aria-label={getInsertSymbolLabel({ insert, pair })}
                    title={getInsertSymbolLabel({ insert, pair })}
                    sx={symbolButtonSx(isFullScreen, isPhone)}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </TableCell>
    </TableRow>
  )
}
