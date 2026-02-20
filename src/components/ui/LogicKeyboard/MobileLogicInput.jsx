import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTheme, useMediaQuery } from '@mui/material'
import LogicInput from './LogicInput.jsx'
import SymbolButtonRow, { symbolRowButtonSx } from '../logicpenguin/SymbolButtonRow.jsx'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'

const DEFAULT_LETTERS = ['P', 'Q', 'R', 'S', 'T']

/** Binary operators get leading and trailing space (matches formula-input.js insOp / logic parsing). */
function isBinaryOp(symbolcat, op) {
  return symbolcat && typeof symbolcat[op] === 'number' && symbolcat[op] >= 2
}

/**
 * From symbolization key lines like "P=It is raining", extract only the symbol (e.g. "P").
 * Definitions stay in the question text; the keyboard shows only the letter for quick insert.
 */
function getVariableLettersOnly(symbolizationKey) {
  if (!symbolizationKey || !Array.isArray(symbolizationKey) || symbolizationKey.length === 0) {
    return DEFAULT_LETTERS
  }
  const letters = symbolizationKey
    .map((line) => {
      if (line != null && typeof line === 'object' && line.symbol != null) {
        return String(line.symbol).trim() || null
      }
      const s = typeof line === 'string' ? line : String(line ?? '')
      const beforeEquals = s.split('=')[0].trim()
      return beforeEquals || null
    })
    .filter(Boolean)
  return letters.length > 0 ? letters : DEFAULT_LETTERS
}

/**
 * On mobile (sm down): LogicInput + SymbolButtonRow + a row of variable letters (symbol only, no definitions).
 * Letters are centered under the symbol row; definitions live in the question.
 * On desktop: renders children (existing native input).
 */
export default function MobileLogicInput({
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  placeholder,
  'aria-label': ariaLabel,
  symbolizationKey,
  includeQuantifiers = true,
  children,
}) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))

  const [cursorPosition, setCursorPosition] = useState(0)
  const [keyboardFocused, setKeyboardFocused] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [slideIn, setSlideIn] = useState(false)

  const onChangeRef = useRef(onChange)
  const setCursorRef = useRef(setCursorPosition)
  onChangeRef.current = onChange
  setCursorRef.current = setCursorPosition

  const syntax = getSyntax()
  const symbols = syntax?.symbols || {}
  const symbolcat = syntax?.symbolcat || {}
  const variableLetters = useMemo(() => getVariableLettersOnly(symbolizationKey), [symbolizationKey])

  const facadeRef = useRef(null)
  if (!facadeRef.current) {
    facadeRef.current = {
      value: value ?? '',
      selectionStart: 0,
      selectionEnd: 0,
      symbols,
      symbolcat: {},
      focus() {},
      setRangeText(text, start, end, _selectMode) {
        const val = this.value
        const newVal = val.slice(0, start) + text + val.slice(end)
        const newPos = start + text.length
        this.value = newVal
        this.selectionStart = newPos
        this.selectionEnd = newPos
        setCursorRef.current(newPos)
        onChangeRef.current?.(newVal)
      },
      setSelectionRange(s, e) {
        this.selectionStart = s
        this.selectionEnd = e ?? s
        setCursorRef.current(s)
      },
      insOp(op) {
        const sym = this.symbols[op]
        if (!sym) return
        const start = this.selectionStart
        const end = this.selectionEnd
        const text = isBinaryOp(this.symbolcat, op) ? ` ${sym} ` : sym
        this.setRangeText(text, start, end)
      },
    }
  }

  const facade = facadeRef.current
  facade.value = value ?? ''
  facade.selectionStart = cursorPosition
  facade.selectionEnd = cursorPosition
  facade.symbols = symbols
  facade.symbolcat = symbolcat

  const handleFocus = useCallback(() => {
    setKeyboardFocused(true)
    onFocus?.()
  }, [onFocus])

  const handleBlur = useCallback(() => {
    setKeyboardFocused(false)
    setIsClosing(true)
    onBlur?.()
  }, [onBlur])

  const showPanel = keyboardFocused || isClosing
  const isVisible = keyboardFocused && slideIn

  useEffect(() => {
    if (keyboardFocused && !slideIn) {
      const id = requestAnimationFrame(() => setSlideIn(true))
      return () => cancelAnimationFrame(id)
    }
    if (!keyboardFocused) setSlideIn(false)
  }, [keyboardFocused, slideIn])

  const handlePanelTransitionEnd = useCallback((e) => {
    if (e.propertyName === 'transform' && isClosing) setIsClosing(false)
  }, [isClosing])

  const handleLetterInsert = useCallback(
    (letter) => {
      const f = facadeRef.current
      if (!f) return
      const start = f.selectionStart ?? 0
      const end = f.selectionEnd ?? start
      const val = f.value ?? ''
      const newVal = val.slice(0, start) + letter + val.slice(end)
      const newPos = start + letter.length
      f.value = newVal
      f.selectionStart = newPos
      f.selectionEnd = newPos
      setCursorPosition(newPos)
      onChange?.(newVal)
    },
    [onChange]
  )

  if (!isPhone) {
    return children ?? null
  }

  return (
    <>
      <LogicInput
        value={value ?? ''}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        cursorPosition={cursorPosition}
        onCursorChange={setCursorPosition}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {showPanel ? (
        <Box
          onTransitionEnd={handlePanelTransitionEnd}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100vw',
            p: 1.5,
            pb: 'max(8px, env(safe-area-inset-bottom, 0px))',
            bgcolor: (t) =>
              t.palette.mode === 'dark'
                ? alpha(t.palette.background.paper, 0.98)
                : t.palette.grey[100],
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: (t) => t.shadows[8],
            overflow: 'hidden',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s ease-in-out',
            willChange: 'transform',
          }}
          role="group"
          aria-label="Formula input shortcuts"
        >
          <Stack spacing={1} sx={{ width: '100%' }}>
            <Box sx={{ width: '100%' }} aria-label="Logic symbols">
              <SymbolButtonRow
                inputRef={facadeRef}
                onValueChange={onChange}
                disabled={disabled}
                includeQuantifiers={includeQuantifiers}
                centerButtons
              />
            </Box>
            <Box sx={{ width: '100%' }} aria-label="Variable letters">
              <Stack
                direction="row"
                spacing={0.5}
                flexWrap="wrap"
                useFlexGap
                justifyContent="center"
              >
                {variableLetters.map((letter) => (
                  <Button
                    key={letter}
                    type="button"
                    size="medium"
                    variant="outlined"
                    disabled={disabled}
                    aria-disabled={disabled}
                    onClick={() => handleLetterInsert(letter)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={`Insert ${letter}`}
                    title={`Insert ${letter}`}
                    sx={symbolRowButtonSx}
                  >
                    {letter}
                  </Button>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </>
  )
}
