import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { Box, Button, Stack, TextField } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTheme, useMediaQuery } from '@mui/material'
import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import FirstPage from '@mui/icons-material/FirstPage'
import LastPage from '@mui/icons-material/LastPage'
import FormulaInput from '../logicpenguin/formula-input.js'
import LogicInput from './LogicInput.jsx'
import SymbolButtonRow, {
  getMobileKeySx,
  mobileKeyGridSx,
  mobileKeyWellSx,
} from '../logicpenguin/SymbolButtonRow.jsx'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'

const DEFAULT_LETTERS = ['P', 'Q', 'R', 'S', 'T']
const DESKTOP_KEYBOARD_ON_MOBILE_KEY = 'logicapp_desktop_keyboard_on_mobile'
const DESKTOP_KEYBOARD_ON_MOBILE_EVENT = 'logicapp_desktop_keyboard_on_mobile_change'

function getDesktopKeyboardOnMobile() {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(DESKTOP_KEYBOARD_ON_MOBILE_KEY) === 'true'
  } catch {
    return false
  }
}

export function useMobileLogicKeyboardEnabled() {
  const [enabled, setEnabled] = useState(() => !getDesktopKeyboardOnMobile())

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handlePreferenceChange = () => {
      setEnabled(!getDesktopKeyboardOnMobile())
    }

    window.addEventListener(DESKTOP_KEYBOARD_ON_MOBILE_EVENT, handlePreferenceChange)
    window.addEventListener('storage', handlePreferenceChange)
    return () => {
      window.removeEventListener(DESKTOP_KEYBOARD_ON_MOBILE_EVENT, handlePreferenceChange)
      window.removeEventListener('storage', handlePreferenceChange)
    }
  }, [])

  return enabled
}

/** Binary operators get leading and trailing space (matches formula-input.js insOp / logic parsing). */
function isBinaryOp(symbolcat, op) {
  return symbolcat && typeof symbolcat[op] === 'number' && symbolcat[op] >= 2
}

function MobileNavKey({ label, onClick, disabled, kind = 'nav', children }) {
  return (
    <Button
      type="button"
      variant="text"
      disableRipple
      disableElevation
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      sx={getMobileKeySx(kind)}
    >
      {children}
    </Button>
  )
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
 * On mobile (sm down): LogicInput + a thumb-sized symbol keyboard.
 * Glyphs come from getSyntax(notation). Pass the course/problem notation
 * name when the engine exposes one (hurley, cambridge, forallx, …).
 */
export default function MobileLogicInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onCursorChange,
  inputRef,
  disabled,
  placeholder,
  'aria-label': ariaLabel,
  symbolizationKey,
  includeQuantifiers = true,
  extraInsertButtons,
  onEnterKey,
  /** Predicate-logic mode: when all three are provided, show predicates / constants / variables rows instead of a single letter row. */
  predicateLetters,
  constantLetters,
  variableLetters: variableLettersProp,
  notation,
  children,
}) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const mobileLogicKeyboardEnabled = useMobileLogicKeyboardEnabled()

  const [cursorPosition, setCursorPosition] = useState(0)
  const [keyboardFocused, setKeyboardFocused] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [slideIn, setSlideIn] = useState(false)
  const desktopInputRef = useRef(null)
  const fieldWrapRef = useRef(null)
  const panelRef = useRef(null)

  const onChangeRef = useRef(onChange)
  const setCursorRef = useRef(setCursorPosition)
  const valueRef = useRef(value ?? '')
  const cursorRef = useRef(cursorPosition)
  onChangeRef.current = onChange
  setCursorRef.current = setCursorPosition
  valueRef.current = value ?? ''
  cursorRef.current = cursorPosition

  const syntax = getSyntax(notation)
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

  useEffect(() => {
    if (!inputRef) return
    if (typeof inputRef === 'function') {
      inputRef(facade)
      return () => inputRef(null)
    }
    inputRef.current = facade
    return () => {
      inputRef.current = null
    }
  }, [facade, inputRef])

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

  useEffect(() => {
    if (!keyboardFocused || !isVisible) return undefined
    const field = fieldWrapRef.current
    const panel = panelRef.current
    if (!field) return undefined

    const pad = panel?.offsetHeight || 220
    const previousPad = document.body.style.paddingBottom
    document.body.style.paddingBottom = `${pad}px`

    const id = window.setTimeout(() => {
      field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 60)

    return () => {
      window.clearTimeout(id)
      document.body.style.paddingBottom = previousPad
    }
  }, [keyboardFocused, isVisible])

  const handlePanelTransitionEnd = useCallback((e) => {
    if (e.propertyName === 'transform' && isClosing) setIsClosing(false)
  }, [isClosing])

  const handleLetterInsert = useCallback((letter) => {
    const f = facadeRef.current
    if (!f) return
    const start = f.selectionStart ?? 0
    const end = f.selectionEnd ?? start
    f.setRangeText(letter, start, end, 'end')
  }, [])

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

  const renderLetterButton = (letter, kind) => (
    <Button
      key={`${kind}-${letter}`}
      type="button"
      size="medium"
      variant="text"
      disableRipple
      disableElevation
      disabled={disabled}
      aria-disabled={disabled}
      onClick={() => handleLetterInsert(letter)}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={kind === 'letter' ? `Insert ${letter}` : `Insert ${kind} ${letter}`}
      title={`Insert ${letter}`}
      sx={getMobileKeySx(kind)}
    >
      {letter}
    </Button>
  )

  const letterRow = (letters, kind) => {
    const cols = Math.min(Math.max(letters.length, 1), 6)
    return (
      <Box sx={mobileKeyGridSx(cols)}>
        {letters.map((letter) => renderLetterButton(letter, kind))}
      </Box>
    )
  }

  if (!isPhone) {
    return children ?? null
  }

  if (!mobileLogicKeyboardEnabled) {
    const syncDesktopValue = (nextValue) => {
      valueRef.current = nextValue
      onChangeRef.current?.(nextValue)
    }

    const setDesktopInputRef = (node) => {
      desktopInputRef.current = node
      if (node) {
        node.syntax = syntax
        node.symbols = symbols
        node.symbolcat = symbolcat
        node.inputfix = syntax?.inputfix
        node.autoChange = FormulaInput.autoChange
        node.insertHere = FormulaInput.insertHere
        node.insOp = FormulaInput.insOp
        node.enterHook = (event) => {
          flushSync(() => syncDesktopValue(node.value ?? ''))
          onEnterKey?.(event)
        }
      }
      if (typeof inputRef === 'function') {
        inputRef(node)
      } else if (inputRef) {
        inputRef.current = node
      }
    }

    return (
      <>
        <TextField
          fullWidth
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={(event) => {
            const input = desktopInputRef.current
            if (!input) return
            FormulaInput.keydown.call(input, event)
            const nextValue = input.value ?? ''
            if (nextValue !== valueRef.current) {
              syncDesktopValue(nextValue)
            }
          }}
          onFocus={onFocus}
          onBlur={(event) => {
            const input = desktopInputRef.current
            if (input?.inputfix) {
              const normalizedValue = input.inputfix(input.value ?? '')
              if (normalizedValue !== input.value) {
                input.value = normalizedValue
                syncDesktopValue(normalizedValue)
              }
            }
            onBlur?.(event)
          }}
          disabled={disabled}
          placeholder={placeholder}
          inputRef={setDesktopInputRef}
          inputProps={{
            autoComplete: 'off',
            spellCheck: false,
            'aria-label': ariaLabel,
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '1rem',
            },
          }}
        />
        <Box sx={{ mt: 1 }}>
          <SymbolButtonRow
            inputRef={desktopInputRef}
            onValueChange={onChange}
            disabled={disabled}
            includeQuantifiers={includeQuantifiers}
            extraInsertButtons={extraInsertButtons}
            mobileLayout
            notation={notation}
          />
        </Box>
      </>
    )
  }

  return (
    <>
      <Box ref={fieldWrapRef}>
        <LogicInput
          value={value ?? ''}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          cursorPosition={cursorPosition}
          onCursorChange={(position) => {
            setCursorPosition(position)
            onCursorChange?.(position)
          }}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
      </Box>
      {showPanel && typeof document !== 'undefined'
        ? createPortal(
            <Box
              ref={panelRef}
              onMouseDown={(e) => e.preventDefault()}
              onTransitionEnd={handlePanelTransitionEnd}
              role="region"
              aria-label="Logic keyboard"
              sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1300,
                boxSizing: 'border-box',
                width: '100%',
                maxWidth: '100vw',
                px: 1,
                pt: 0.75,
                pb: 'max(10px, env(safe-area-inset-bottom, 0px))',
                bgcolor: 'transparent',
                backgroundImage: (t) =>
                  t.palette.mode === 'dark'
                    ? `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.22)} 0%, ${alpha(t.palette.background.paper, 0.96)} 34%, ${t.palette.background.default} 100%)`
                    : `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.14)} 0%, ${t.palette.grey[100]} 32%, ${t.palette.grey[300]} 100%)`,
                borderTop: '1px solid',
                borderColor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.28 : 0.18),
                boxShadow: (t) =>
                  t.palette.mode === 'dark'
                    ? '0 -12px 32px rgba(0,0,0,0.45)'
                    : '0 -10px 28px rgba(83, 109, 254, 0.12), 0 -4px 12px rgba(15, 23, 42, 0.08)',
                overflow: 'hidden',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.28s ease-in-out',
                willChange: 'transform',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 18,
                  pointerEvents: 'none',
                  background: (t) =>
                    t.palette.mode === 'dark'
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)',
                },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'text.disabled',
                  opacity: 0.45,
                  mx: 'auto',
                  mb: 0.85,
                  position: 'relative',
                }}
              />
              <Stack spacing={1} sx={{ width: '100%', position: 'relative' }}>
                <Box role="group" aria-label="Connectives and grouping" sx={mobileKeyWellSx('operators')}>
                  <SymbolButtonRow
                    inputRef={facadeRef}
                    onValueChange={onChange}
                    disabled={disabled}
                    includeQuantifiers={includeQuantifiers}
                    showBackspace={false}
                    extraInsertButtons={extraInsertButtons}
                    mobileLayout
                    notation={notation}
                  />
                </Box>

                {usePredicateLayout ? (
                  <Box role="group" aria-label="Predicates, constants, and variables" sx={mobileKeyWellSx('letters')}>
                    <Stack spacing={0.5}>
                      {predicateLetters.length > 0 && letterRow(predicateLetters, 'predicate')}
                      {constantLetters.length > 0 && letterRow(constantLetters, 'constant')}
                      {variableLettersProp.length > 0 && letterRow(variableLettersProp, 'variable')}
                    </Stack>
                  </Box>
                ) : (
                  <Box role="group" aria-label="Letters" sx={mobileKeyWellSx('letters')}>
                    {letterRow(variableLetters, 'letter')}
                  </Box>
                )}

                <Box role="group" aria-label="Cursor and backspace" sx={mobileKeyWellSx('nav')}>
                  <Box sx={mobileKeyGridSx(5)}>
                    <MobileNavKey label="Move cursor to start" onClick={handleNavStart} disabled={disabled}>
                      <FirstPage fontSize="small" />
                    </MobileNavKey>
                    <MobileNavKey label="Move cursor left" onClick={handleNavLeft} disabled={disabled}>
                      <ChevronLeft fontSize="small" />
                    </MobileNavKey>
                    <MobileNavKey label="Move cursor right" onClick={handleNavRight} disabled={disabled}>
                      <ChevronRight fontSize="small" />
                    </MobileNavKey>
                    <MobileNavKey label="Move cursor to end" onClick={handleNavEnd} disabled={disabled}>
                      <LastPage fontSize="small" />
                    </MobileNavKey>
                    <MobileNavKey label="Backspace" onClick={handleBackspace} disabled={disabled} kind="backspace">
                      <BackspaceOutlined fontSize="small" />
                    </MobileNavKey>
                  </Box>
                </Box>
              </Stack>
            </Box>,
            document.body,
          )
        : null}
    </>
  )
}
