import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { getInsertSymbolLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import { DERIVATION_LINE_FONT_SIZE } from './derivationTableConfig.js'

export default function DerivationFormulaText({ text = '', id, onInsert, sx }) {
  return (
    <Box
      component="span"
      sx={[
        {
          fontSize: DERIVATION_LINE_FONT_SIZE,
          color: 'text.primary',
          '& .clickable-char': {
            cursor: 'pointer',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: (theme) => alpha(
                theme.palette.primary.main,
                theme.palette.action.hoverOpacity
              ),
            },
          },
        },
        sx,
      ]}
    >
      {text.split('').map((char, index) => /^[a-zA-Z]$/.test(char) ? (
        <Box
          component="span"
          key={`${id}-${index}`}
          className="clickable-char"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onInsert(char)}
          aria-label={getInsertSymbolLabel({ insert: char })}
        >
          {char}
        </Box>
      ) : (
        <Box component="span" key={`${id}-${index}`}>{char}</Box>
      ))}
    </Box>
  )
}
