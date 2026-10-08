import { TableCell, TableRow, Typography } from '@mui/material'
import DerivationFormulaText from './DerivationFormulaText.jsx'
import {
  getDerivationNumberCellWidthSx,
  getDerivationRowSx,
} from './derivationTableConfig.js'

// flat derivations with no premises show the target where premises would sit
export default function DerivationConclusionRow({
  isCompact,
  isFullScreen,
  isMobile,
  onInsert,
  text,
}) {
  const fieldCellSx = isFullScreen
    ? { width: '50%', minWidth: 0 }
    : { width: 'auto', whiteSpace: 'nowrap' }
  return (
    <TableRow sx={getDerivationRowSx(isMobile)}>
      <TableCell sx={{ ...getDerivationNumberCellWidthSx(isCompact), borderBottom: 'none', verticalAlign: 'middle', px: 0.5, textAlign: 'center' }}>
        <Typography sx={{ color: 'transparent' }}>—</Typography>
      </TableCell>
      <TableCell sx={{ borderBottom: 'none', pl: isFullScreen ? 1 : undefined, pr: 0.5, verticalAlign: 'middle', ...fieldCellSx }}>
        <Typography sx={{ color: 'transparent' }}>—</Typography>
      </TableCell>
      <TableCell sx={{ borderBottom: 'none', pl: 0.5, verticalAlign: 'middle', ...fieldCellSx }}>
        <DerivationFormulaText text={text} id="conclusion-target" onInsert={onInsert} />
      </TableCell>
    </TableRow>
  )
}
