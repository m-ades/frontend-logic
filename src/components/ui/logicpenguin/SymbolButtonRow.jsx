import { Box, Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
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

const fill = (theme, light, dark) => (theme.palette.mode === 'dark' ? dark : light)

const hueTone = (paletteKey, lightFill, darkFill) => ({
  bgcolor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill, darkFill)),
  borderColor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill + 0.16, darkFill + 0.12)),
  color: 'text.primary',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill + 0.07, darkFill + 0.08)),
      borderColor: (theme) => alpha(theme.palette[paletteKey].main, 0.5),
      boxShadow: 'none',
    },
  },
  '&:active': {
    bgcolor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill + 0.12, darkFill + 0.12)),
    borderColor: (theme) => theme.palette[paletteKey].main,
    boxShadow: 'none',
    transform: 'scale(0.97)',
  },
})

const utilityTone = (emphasis = false) => ({
  bgcolor: (theme) => {
    if (theme.palette.mode === 'dark') {
      return alpha(theme.palette.common.white, emphasis ? 0.14 : 0.08)
    }
    return emphasis ? theme.palette.grey[300] : theme.palette.grey[200]
  },
  borderColor: (theme) =>
    alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.08),
  color: emphasis ? 'text.primary' : 'text.secondary',
  boxShadow: 'none',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: (theme) =>
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, emphasis ? 0.2 : 0.14)
          : theme.palette.grey[emphasis ? 400 : 300],
      borderColor: 'divider',
      boxShadow: 'none',
    },
  },
  '&:active': {
    bgcolor: (theme) =>
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.22)
        : theme.palette.grey[400],
    boxShadow: 'none',
    transform: 'scale(0.97)',
  },
})

/** Compact buttons for the desktop symbol toolbar. */
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
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiButton-label': { fontSize: '1rem' },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      boxShadow: 'none',
      backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
    },
  },
  '&:active': {
    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.14),
  },
}

/** Shared layout for phone keys. Color comes from getMobileKeySx(kind). */
export const mobileKeyBaseSx = {
  minWidth: 0,
  width: '100%',
  minHeight: 44,
  height: 44,
  px: 0.25,
  py: 0,
  fontSize: '1.2rem',
  lineHeight: 1,
  fontWeight: 600,
  textTransform: 'none',
  color: 'text.primary',
  borderRadius: 1.75,
  border: '1px solid',
  boxShadow: (theme) =>
    theme.palette.mode === 'dark'
      ? 'inset 0 1px 0 rgba(255,255,255,0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.72)',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  transition: (theme) =>
    theme.transitions.create(['background-color', 'border-color', 'transform'], {
      duration: 90,
    }),
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiButton-label': { fontSize: '1.2rem' },
  '&.Mui-focusVisible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 1,
  },
  '&.Mui-disabled': {
    opacity: 0.38,
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:active': { transform: 'none' },
  },
}

const mobileKeyToneSx = {
  connective: hueTone('primary', 0.12, 0.24),
  grouping: hueTone('info', 0.1, 0.22),
  extra: hueTone('primary', 0.06, 0.16),
  predicate: hueTone('warning', 0.18, 0.22),
  constant: hueTone('success', 0.14, 0.2),
  variable: hueTone('info', 0.12, 0.22),
  letter: hueTone('primary', 0.08, 0.2),
  nav: utilityTone(false),
  backspace: utilityTone(true),
}

export const getMobileKeySx = (kind = 'letter') => [
  mobileKeyBaseSx,
  mobileKeyToneSx[kind] || mobileKeyToneSx.letter,
]

export const mobileKeyGridSx = (columns) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: 0.5,
  width: '100%',
})

export const mobileKeyWellSx = (kind = 'letters') => {
  const tint =
    kind === 'operators'
      ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07)
      : kind === 'nav'
        ? (theme) => alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.06)
        : (theme) => alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.04)
  return {
    p: 0.75,
    borderRadius: 2,
    bgcolor: tint,
    boxShadow: (theme) =>
      theme.palette.mode === 'dark'
        ? 'inset 0 1px 2px rgba(0,0,0,0.35)'
        : 'inset 0 1px 2px rgba(15, 23, 42, 0.06)',
  }
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
  /** Equal-width grid rows sized for thumbs. */
  mobileLayout = false,
  notation,
}) {
  const syntax = getSyntax(notation)
  const symbols = syntax?.symbols || inputRef?.current?.symbols || {}

  const quantifierText = (op) => {
    const sym = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
    if (typeof syntax?.mkquantifier === 'function') {
      return syntax.mkquantifier('x', sym)
    }
    return `(${sym}x)`
  }

  const resolveLabel = (op, quantifier = false, insert = null, pair = null, backspace = false) => {
    if (backspace) return '←'
    if (insert) return insert
    if (pair) {
      const open = pair[0]
      const close = pair[1]
      return `${open}  ${close}`
    }
    if (quantifier) return quantifierText(op)
    return symbols?.[op] || FALLBACK_SYMBOLS[op] || op
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
    const text = quantifierText(op)
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
    const sym = symbols?.[op]
    if (!sym) return
    const text = (syntax?.symbolcat?.[op] ?? 0) >= 2 ? ` ${sym} ` : sym
    insertLiteral(input, text)
    finalizeChange(input)
  }

  const baseButtonsRaw = includeQuantifiers
    ? BUTTONS
    : BUTTONS.filter((btn) => !btn.quantifier)
  const baseButtons = showBackspace
    ? baseButtonsRaw
    : baseButtonsRaw.filter((btn) => !btn.backspace)
  const extras = extraInsertButtons || []
  const visibleButtons = baseButtons.length > 0 && baseButtons[baseButtons.length - 1].backspace
    ? [...baseButtons.slice(0, -1), ...extras, { backspace: true }]
    : [...baseButtons, ...extras]

  const renderButton = (btn, kind = 'connective') => {
    const { op, quantifier, insert, pair, backspace } = btn
    const visualSymbol = resolveLabel(op, quantifier, insert, pair, backspace)
    const a11yLabel = backspace
      ? 'Backspace'
      : getInsertSymbolLabel({
          insert: pair ? null : visualSymbol,
          pair,
        })
    return (
      <Button
        key={backspace ? 'backspace' : (op || insert || pair)}
        type="button"
        size="medium"
        variant={mobileLayout ? 'text' : 'outlined'}
        disableRipple={mobileLayout}
        disableElevation={mobileLayout}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleInsert({ op, quantifier, insert, pair, backspace })}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={a11yLabel}
        title={a11yLabel}
        sx={mobileLayout ? getMobileKeySx(kind) : symbolRowButtonSx}
      >
        <LogicSymbol symbol={visualSymbol} decorative />
      </Button>
    )
  }

  if (mobileLayout) {
    const connectives = visibleButtons.filter((btn) => btn.op && !btn.quantifier)
    const grouping = visibleButtons.filter((btn) => btn.quantifier || btn.pair)
    const extraRow = visibleButtons.filter((btn) => btn.insert)
    const backspaceBtn = visibleButtons.find((btn) => btn.backspace)

    return (
      <Box aria-label="Symbol shortcuts" role="group" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {connectives.length > 0 && (
          <Box sx={mobileKeyGridSx(connectives.length)}>
            {connectives.map((btn) => renderButton(btn, 'connective'))}
          </Box>
        )}
        {grouping.length > 0 && (
          <Box sx={mobileKeyGridSx(grouping.length)}>
            {grouping.map((btn) => renderButton(btn, 'grouping'))}
          </Box>
        )}
        {extraRow.length > 0 && (
          <Box sx={mobileKeyGridSx(Math.min(extraRow.length, 4))}>
            {extraRow.map((btn) => renderButton(btn, 'extra'))}
          </Box>
        )}
        {backspaceBtn ? <Box sx={mobileKeyGridSx(1)}>{renderButton(backspaceBtn, 'backspace')}</Box> : null}
      </Box>
    )
  }

  return (
    <Box aria-label="Symbol shortcuts" role="group">
      <Stack
        direction="row"
        spacing={0.5}
        flexWrap="wrap"
        useFlexGap
        sx={centerButtons ? { justifyContent: 'center' } : undefined}
      >
        {visibleButtons.map(renderButton)}
      </Stack>
    </Box>
  )
}
