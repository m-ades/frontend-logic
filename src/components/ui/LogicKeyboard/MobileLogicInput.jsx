import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
 * Variable letters for the mobile keyboard. Uses the DB symbolizationKey directly
 * (array of "Symbol = definition" strings); we do not parse premises.
 * Returns the symbol (letter) from each key line for quick-insert buttons.
 */
function getVariableLettersOnly(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return DEFAULT_LETTERS
  const letters = symbolizationKey
    .map((line) => {
      const s = typeof line === 'string' ? line : String(line ?? '')
      const splitAt = s.search(/[=:]/)
      const symbol = (splitAt === -1 ? s : s.slice(0, splitAt)).trim()
      return symbol || null
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
  extraInsertButtons,
  /** Predicate-logic mode: when all three are provided, show predicates / constants / variables rows instead of a single letter row. */
  predicateLetters,
  constantLetters,
  variableLetters: variableLettersProp,
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
  const valueRef = useRef(value ?? '')
  const cursorRef = useRef(cursorPosition)
  onChangeRef.current = onChange
  setCursorRef.current = setCursorPosition
  valueRef.current = value ?? ''
  cursorRef.current = cursorPosition

  const syntax = getSyntax()
  const symbols = syntax?.symbols || {}
  const symbolcat = syntax?.symbolcat || {}
  const usePredicateLayout = Array.isArray(predicateLetters) && Array.isArray(constantLetters) && Array.isArray(variableLettersProp)
  const variableLettersFromKey = useMemo(() => getVariableLettersOnly(symbolizationKey), [symbolizationKey])
  const variableLetters = usePredicateLayout ? variableLettersProp : variableLettersFromKey

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
        valueRef.current = newVal
        cursorRef.current = newPos
        setCursorRef.current(newPos)
        onChangeRef.current?.(newVal)
      },
      setSelectionRange(s, e) {
        this.selectionStart = s
        this.selectionEnd = e ?? s
        cursorRef.current = s
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
      valueRef.current = newVal
      cursorRef.current = newPos
      setCursorPosition(newPos)
      onChange?.(newVal)
    },
    [onChange]
  )

  useEffect(() => {
    const val = value ?? ''
    if (cursorRef.current > val.length) setCursorPosition(val.length)
  }, [value])

  const handleNavLeft = useCallback(() => {
    setCursorPosition((prev) => Math.max(0, prev - 1))
  }, [])
  const handleNavRight = useCallback(() => {
    setCursorPosition((prev) => Math.min((valueRef.current ?? '').length, prev + 1))
  }, [])
  const handleNavStart = useCallback(() => setCursorPosition(0), [])
  const handleNavEnd = useCallback(() => {
    setCursorPosition((valueRef.current ?? '').length)
  }, [])

  const handleBackspace = useCallback(() => {
    if (disabled) return
    const f = facadeRef.current
    if (!f) return
    const start = f.selectionStart ?? 0
    const end = f.selectionEnd ?? start
    const val = f.value ?? ''
    if (start === 0 && end === 0) return
    if (start === end) {
      f.setRangeText('', start - 1, end, 'end')
    } else {
      f.setRangeText('', start, end, 'end')
    }
  }, [disabled])

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
      {showPanel && typeof document !== 'undefined'
        ? createPortal(
            <Box
              onMouseDown={(e) => e.preventDefault()}
              onTransitionEnd={handlePanelTransitionEnd}
              role="region"
              aria-label="Formula keyboard: insert logic symbols and letters, move cursor with arrow buttons"
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
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
              }}
            >
          <Stack spacing={1} sx={{ width: '100%' }}>
            <Box role="group" sx={{ width: '100%' }} aria-label="Logic symbols: connectives, quantifiers, parentheses">
              <SymbolButtonRow
                inputRef={facadeRef}
                onValueChange={onChange}
                disabled={disabled}
                includeQuantifiers={includeQuantifiers}
                showBackspace={false}
                extraInsertButtons={extraInsertButtons}
                centerButtons
              />
            </Box>
            {usePredicateLayout ? (
              <Box
                role="group"
                sx={{ width: '100%' }}
                aria-label="Letters: predicates, constants, variables. Tap to insert at cursor"
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  useFlexGap
                  justifyContent="center"
                  sx={{ rowGap: 0.5 }}
                >
                  {predicateLetters.map((letter) => (
                    <Button
                      key={`pred-${letter}`}
                      type="button"
                      size="medium"
                      variant="outlined"
                      disabled={disabled}
                      aria-disabled={disabled}
                      onClick={() => handleLetterInsert(letter)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={`Insert predicate ${letter}`}
                      title={`Insert ${letter}`}
                      sx={symbolRowButtonSx}
                    >
                      {letter}
                    </Button>
                  ))}
                  {constantLetters.map((letter) => (
                    <Button
                      key={`const-${letter}`}
                      type="button"
                      size="medium"
                      variant="outlined"
                      disabled={disabled}
                      aria-disabled={disabled}
                      onClick={() => handleLetterInsert(letter)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={`Insert constant ${letter}`}
                      title={`Insert ${letter}`}
                      sx={symbolRowButtonSx}
                    >
                      {letter}
                    </Button>
                  ))}
                  {variableLettersProp.map((letter) => (
                    <Button
                      key={`var-${letter}`}
                      type="button"
                      size="medium"
                      variant="outlined"
                      disabled={disabled}
                      aria-disabled={disabled}
                      onClick={() => handleLetterInsert(letter)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={`Insert variable ${letter}`}
                      title={`Insert ${letter}`}
                      sx={symbolRowButtonSx}
                    >
                      {letter}
                    </Button>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box role="group" sx={{ width: '100%' }} aria-label="Variable letters: tap to insert at cursor">
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
            )}
            <Box role="group" sx={{ width: '100%' }} aria-label="Cursor navigation and backspace">
              <Stack
                direction="row"
                spacing={0.5}
                flexWrap="wrap"
                useFlexGap
                justifyContent="center"
              >
                <Button
                  type="button"
                  size="medium"
                  variant="outlined"
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={handleNavStart}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Move cursor to start"
                  title="Move cursor to start"
                  sx={symbolRowButtonSx}
                >
                  ⇤
                </Button>
                <Button
                  type="button"
                  size="medium"
                  variant="outlined"
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={handleNavLeft}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Move cursor left"
                  title="Move cursor left"
                  sx={symbolRowButtonSx}
                >
                  {'<'}
                </Button>
                <Button
                  type="button"
                  size="medium"
                  variant="outlined"
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={handleNavRight}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Move cursor right"
                  title="Move cursor right"
                  sx={symbolRowButtonSx}
                >
                  {'>'}
                </Button>
                <Button
                  type="button"
                  size="medium"
                  variant="outlined"
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={handleNavEnd}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Move cursor to end"
                  title="Move cursor to end"
                  sx={symbolRowButtonSx}
                >
                  ⇥
                </Button>
                <Button
                  type="button"
                  size="medium"
                  variant="outlined"
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={handleBackspace}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Backspace"
                  title="Backspace"
                  sx={symbolRowButtonSx}
                >
                  ←
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>,
            document.body
          )
        : null}
    </>
  )
}
