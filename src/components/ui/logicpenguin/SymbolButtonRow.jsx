import { Box, Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { getNotation } from '../../../lib/logicSystems.js'
import LogicSymbol, { getInsertSymbolLabel } from './LogicSymbol.jsx'

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
  { pair: '()' },
  { pair: '[]' },
  { backspace: true },
]

/** Shared sx for symbol, variable, and navigation keyboard buttons. */
export const symbolRowButtonSx = {
  minWidth: 34,
  height: 34,
  px: 1,
  py: 0,
  fontSize: '1rem',
  lineHeight: 1.1,
  minHeight: 34,
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiButton-label': { fontSize: '1rem' },
  '&:hover': (theme) => ({
    boxShadow: 'none',
    border: 'none',
    backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
  }),
}

export default function SymbolButtonRow({
  inputRef,
  onValueChange,
  disabled = false,
  includeQuantifiers = true,
  /** When false, omit the backspace button (e.g. mobile keyboard places it on the nav row). */
  showBackspace = true,
  extraInsertButtons,
  centerButtons = false,
  logicSystem,
}) {
  const syntax = getSyntax(getNotation(logicSystem))
  const inputSymbols = inputRef?.current?.symbols
  const symbols = inputSymbols || syntax?.symbols || {}

  const resolveLabel = (op, quantifier = false, insert = null, pair = null, backspace = false) => {
    if (backspace) return '←'
    if (insert) return insert
    if (pair) {
      const open = pair[0]
      const close = pair[1]
      return `${open}  ${close}`
    }
    const sym = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
    return quantifier ? `(${sym}x)` : sym
  }

  const finalizeChange = (input) => {
    if (onValueChange) {
      onValueChange(input.value ?? '')
    }
  }

  const markChanged = (input) => {
    if (input?.myline?.mysubderiv?.myprob.makeChanged) {
      input.myline.mysubderiv.myprob.makeChanged(false, true)
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
    markChanged(input)
  }

  const insertLiteral = (input, text) => {
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    input.setRangeText(text, start, end, 'end')
    input.focus()
    input.setSelectionRange(start + text.length, start + text.length)
    markChanged(input)
  }

  const insertPair = (input, pairText) => {
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    const [open, close] = pairText.split('')
    const hasSelection = end > start
    const selected = hasSelection ? input.value.slice(start, end) : ''
    const text = hasSelection ? `${open}${selected}${close}` : `${open}  ${close}`
    input.setRangeText(text, start, end, 'end')
    input.focus()
    if (hasSelection) {
      const newPos = start + text.length
      input.setSelectionRange(newPos, newPos)
    } else {
      const newPos = start + open.length + 1
      input.setSelectionRange(newPos, newPos)
    }
    markChanged(input)
  }

  const handleBackspace = (input) => {
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    if (start === 0 && end === 0) return
    if (start === end) {
      input.setRangeText('', start - 1, end, 'end')
    } else {
      input.setRangeText('', start, end, 'end')
    }
    input.focus()
    markChanged(input)
    finalizeChange(input)
  }

  const handleInsert = ({ op, quantifier = false, insert = null, pair = null, backspace = false }) => {
    if (disabled) return
    const input = inputRef?.current
    if (!input) return
    if (backspace) {
      handleBackspace(input)
      return
    }
    if (insert) {
      insertLiteral(input, insert)
      finalizeChange(input)
      return
    }
    if (pair) {
      insertPair(input, pair)
      finalizeChange(input)
      return
    }
    if (quantifier) {
      insertQuantifier(input, op)
      finalizeChange(input)
      return
    }
    if (typeof input.insOp !== 'function') return
    input.insOp(op)
    finalizeChange(input)
  }

  const baseButtonsRaw = includeQuantifiers
    ? BUTTONS
    : BUTTONS.filter((btn) => !btn.quantifier)
  const baseButtons = showBackspace
    ? baseButtonsRaw
    : baseButtonsRaw.filter((btn) => !btn.backspace)
  const visibleButtons = baseButtons.length > 0 && baseButtons[baseButtons.length - 1].backspace
    ? [...baseButtons.slice(0, -1), ...(extraInsertButtons || []), { backspace: true }]
    : [...baseButtons, ...(extraInsertButtons || [])]

  return (
    <Box aria-label="Symbol shortcuts">
      <Stack
        direction="row"
        spacing={0.5}
        flexWrap="wrap"
        useFlexGap
        sx={centerButtons ? { justifyContent: 'center' } : undefined}
      >
        {visibleButtons.map(({ op, quantifier, insert, pair, backspace }) => {
          const visualSymbol = resolveLabel(op, quantifier, insert, pair, backspace)
          const a11yLabel = backspace ? 'Backspace' : getInsertSymbolLabel({
            insert: pair ? null : visualSymbol,
            pair,
          })
          return (
            <Button
              key={backspace ? 'backspace' : (op || insert || pair)}
              type="button"
              size="medium"
              variant="outlined"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleInsert({ op, quantifier, insert, pair, backspace })}
              disabled={disabled}
              aria-disabled={disabled}
              aria-label={a11yLabel}
              title={a11yLabel}
              sx={symbolRowButtonSx}
            >
              <LogicSymbol symbol={visualSymbol} />
            </Button>
          )
        })}
      </Stack>
    </Box>
  )
}
