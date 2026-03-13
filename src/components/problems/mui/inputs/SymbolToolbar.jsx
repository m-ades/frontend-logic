import { Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import getSyntax from '../../../../lib/logicpenguin/symbolic/libsyntax.js'

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
]

const INSERT_LABELS = {
  '~': 'Insert tilde',
  '•': 'Insert dot',
  '∨': 'Insert wedge',
  '⊃': 'Insert horseshoe',
  '≡': 'Insert triple bar',
  '∀': 'Insert universal quantifier',
  '∃': 'Insert existential quantifier',
  '()': 'Insert parentheses',
  '[]': 'Insert brackets',
}

const getInsertText = (symbols, { op, quantifier = false, pair = null }) => {
  if (pair) return pair
  const symbol = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
  return quantifier ? `(${symbol}x)` : symbol
}

const getToolbarLabel = (insertText, pair) => {
  if (pair) return INSERT_LABELS[pair] || `Insert ${pair}`
  if (!insertText) return 'Insert symbol'
  if (INSERT_LABELS[insertText]) return INSERT_LABELS[insertText]
  if (/^[A-Za-z]$/.test(insertText)) return `Insert letter ${insertText.toUpperCase()}`
  return `Insert ${insertText}`
}

const insertIntoInput = (input, text, pair = false) => {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  let nextValue = input.value ?? ''
  let nextCursor = start + text.length

  if (pair) {
    const open = text[0]
    const close = text[1]
    const selected = start === end ? '' : nextValue.slice(start, end)
    const inserted = selected ? `${open}${selected}${close}` : `${open}  ${close}`
    if (typeof input.setRangeText === 'function') {
      input.setRangeText(inserted, start, end, 'end')
      nextValue = input.value ?? ''
    } else {
      nextValue = `${nextValue.slice(0, start)}${inserted}${nextValue.slice(end)}`
      input.value = nextValue
    }
    nextCursor = selected ? start + inserted.length : start + 2
  } else {
    if (typeof input.setRangeText === 'function') {
      input.setRangeText(text, start, end, 'end')
      nextValue = input.value ?? ''
    } else {
      nextValue = `${nextValue.slice(0, start)}${text}${nextValue.slice(end)}`
      input.value = nextValue
    }
  }

  input.focus()
  input.setSelectionRange(nextCursor, nextCursor)
  return nextValue
}

export default function SymbolToolbar({
  inputRef,
  onValueChange,
  disabled = false,
  includeQuantifiers = true,
}) {
  const syntax = getSyntax()
  const symbols = syntax?.symbols || {}
  const visibleButtons = includeQuantifiers
    ? BUTTONS
    : BUTTONS.filter((button) => !button.quantifier)

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap aria-label="Symbol shortcuts">
      {visibleButtons.map(({ op, quantifier, pair }) => {
        const insertText = getInsertText(symbols, { op, quantifier, pair })
        return (
          <Button
            key={op || pair}
            type="button"
            size="small"
            variant="text"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const input = inputRef?.current
              if (!input) return
              const nextValue = insertIntoInput(input, insertText, Boolean(pair))
              onValueChange?.(nextValue)
            }}
            aria-label={getToolbarLabel(insertText, pair)}
            sx={{
              minWidth: 34,
              px: 1,
              py: 0.45,
              minHeight: 34,
              color: 'text.primary',
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: 1.1,
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': {
                backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
              },
            }}
          >
            {pair ? `${pair[0]}  ${pair[1]}` : insertText}
          </Button>
        )
      })}
    </Stack>
  )
}
