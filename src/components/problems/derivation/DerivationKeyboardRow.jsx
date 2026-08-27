import { Box, IconButton, Stack, TableCell, TableRow, Tooltip } from '@mui/material'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import { getInsertSymbolLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import LogicSymbolKeyRow from '../../ui/logicpenguin/LogicSymbolKeyRow.jsx'
import {
  DERIVATION_NUMBER_CELL_WIDTH_DESKTOP,
  DERIVATION_NUMBER_CELL_WIDTH_MOBILE,
} from './derivationTableConfig.js'

export default function DerivationKeyboardRow({
  canAddLine,
  isFullScreen,
  isMobile,
  isPhone,
  mobileLogicKeyboardEnabled,
  onAddLine,
  onInsert,
  symbolButtons,
}) {
  const compactMobileKeyboard = isPhone && isFullScreen && mobileLogicKeyboardEnabled
  const numberWidth = isFullScreen || isMobile
    ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE
    : DERIVATION_NUMBER_CELL_WIDTH_DESKTOP
  const density = isPhone && isFullScreen ? 'touch' : isFullScreen ? 'compact' : 'standard'
  const rowButtons = symbolButtons.map(({ label, insert, pair }) => ({
    key: label,
    label,
    ariaLabel: getInsertSymbolLabel({ insert, pair }),
    payload: { insert, pair },
  }))

  return (
    <TableRow sx={{ '& td': { verticalAlign: 'middle', py: isMobile ? 0.25 : 0.5 } }}>
      <TableCell sx={{ width: numberWidth, minWidth: isFullScreen || isMobile ? numberWidth : undefined, borderBottom: 'none', px: 0.5, textAlign: 'center' }}>
        <Tooltip title="New line">
          <span style={{ display: 'inline-flex' }}>
            <IconButton onClick={onAddLine} size="small" aria-label="Add line" disabled={!canAddLine}>
              <SubdirectoryArrowRightIcon />
            </IconButton>
          </span>
        </Tooltip>
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
            {!compactMobileKeyboard && (
              <LogicSymbolKeyRow
                buttons={rowButtons}
                onSelect={onInsert}
                density={density}
                wrap={isFullScreen}
                gap={isFullScreen ? 0.5 : 0.75}
                sx={{ minWidth: 0, flex: 1 }}
              />
            )}
          </Box>
        </Stack>
      </TableCell>
    </TableRow>
  )
}
