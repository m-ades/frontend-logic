import { Box, Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'

const FALLBACK_SYMBOLS = {
  NOT: '~',
  AND: '\u2022',
  OR: '\u2228',
  IFTHEN: '\u2283',
  IFF: '\u2261',
  FORALL: '\u2200',
  EXISTS: '\u2203',
}

const BUTTONS = [
  { op: 'NOT' },
  { op: 'AND' },
  { op: 'OR' },
  { op: 'IFTHEN' },
  { op: 'IFF' },
  { op: 'FORALL', quantifier: true },
  { op: 'EXISTS', quantifier: true },
]

export default function SymbolButtonRow({
  inputRef,
  onValueChange,
  disabled = false,
  includeQuantifiers = true,
}) {
  const syntax = getSyntax()
  const inputSymbols = inputRef?.current?.symbols
  const symbols = inputSymbols || syntax?.symbols || {}

  const resolveLabel = (op, quantifier = false) => {
    const sym = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
    return quantifier ? `(${sym}x)` : sym
  }

  const finalizeChange = (input) => {
    if (onValueChange) {
      onValueChange(input.value ?? '')
    }
  }

  const insertQuantifier = (input, op) => {
    const sym = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
    const text = `(${sym}x)`
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    input.setRangeText(text, start, end, 'end')
    input.focus()
    input.setSelectionRange(start + text.length, start + text.length)
  }

  const handleInsert = (op, quantifier = false) => {
    if (disabled) return
    const input = inputRef?.current
    if (!input) return
    if (quantifier) {
      insertQuantifier(input, op)
      finalizeChange(input)
      return
    }
    if (typeof input.insOp !== 'function') return
    input.insOp(op)
    finalizeChange(input)
  }

  const visibleButtons = includeQuantifiers
    ? BUTTONS
    : BUTTONS.filter((btn) => !btn.quantifier)

  return (
    <Box aria-label="Symbol shortcuts">
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {visibleButtons.map(({ op, quantifier }) => (
          <Button
            key={op}
            type="button"
            size="small"
            variant="outlined"
            onClick={() => handleInsert(op, quantifier)}
            disabled={disabled}
            aria-disabled={disabled}
            title={`Insert ${resolveLabel(op, quantifier)}`}
            sx={{
              minWidth: 0,
              px: 0.7,
              py: 0.2,
              fontSize: '0.875rem',
              lineHeight: 1,
              minHeight: 28,
              textTransform: 'none',
              boxShadow: 'none',
              border: 'none',
              '&:hover': (theme) => ({
                boxShadow: 'none',
                border: 'none',
                backgroundColor: alpha(
                  theme.palette.primary.main,
                  theme.palette.action.hoverOpacity,
                ),
              }),
            }}
          >
            {resolveLabel(op, quantifier)}
          </Button>
        ))}
      </Stack>
    </Box>
  )
}
