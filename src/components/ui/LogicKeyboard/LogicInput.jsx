import { useCallback, useState, useEffect, useRef } from 'react'
import { Box } from '@mui/material'

const visuallyHiddenSx = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * Controlled "input" that displays value and a blinking cursor; tap-to-place cursor.
 * No native <input> so the OS does not open the system keyboard (for use with LogicKeyboard on mobile).
 * Accessible: role=textbox, aria-label, aria-placeholder, live region for cursor position.
 */
export default function LogicInput({
  value = '',
  onChange,
  onFocus,
  onBlur,
  onCursorChange,
  cursorPosition: controlledCursor,
  disabled = false,
  placeholder = '',
  'aria-label': ariaLabel = 'Formula input',
  sx = {},
  cursorBlinkMs = 1000,
}) {
  const [internalCursor, setInternalCursor] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [cursorAnnouncement, setCursorAnnouncement] = useState('')
  const lastAnnouncedCursorRef = useRef(-1)

  const isControlledCursor = controlledCursor !== undefined
  const cursorPosition = isControlledCursor ? controlledCursor : internalCursor
  const len = value.length
  const clampedCursor = Math.max(0, Math.min(cursorPosition, len))

  const setCursor = useCallback(
    (pos) => {
      const clamped = Math.max(0, Math.min(pos, value.length))
      if (isControlledCursor) {
        onCursorChange?.(clamped)
      } else {
        setInternalCursor(clamped)
        onCursorChange?.(clamped)
      }
    },
    [onCursorChange, isControlledCursor, value.length]
  )

  useEffect(() => {
    if (clampedCursor !== cursorPosition) {
      if (isControlledCursor) {
        onCursorChange?.(clampedCursor)
      } else {
        setInternalCursor(clampedCursor)
        onCursorChange?.(clampedCursor)
      }
    }
  }, [len])

  useEffect(() => {
    if (!isFocused || lastAnnouncedCursorRef.current === clampedCursor) return
    lastAnnouncedCursorRef.current = clampedCursor
    const total = len
    const pos = clampedCursor
    setCursorAnnouncement(total === 0 ? 'Empty. Position 0.' : `Position ${pos} of ${total}.`)
  }, [isFocused, clampedCursor, len])

  const handleContainerClick = useCallback(
    (e) => {
      if (disabled) return
      const target = e.target
      const index = target.getAttribute('data-char-index')
      if (index !== null) {
        const i = parseInt(index, 10)
        if (Number.isFinite(i)) setCursor(i + 1)
      } else {
        setCursor(len)
      }
    },
    [disabled, setCursor, len]
  )

  const handleFocus = useCallback(() => {
    if (disabled) return
    setIsFocused(true)
    if (value.length > 0 && clampedCursor === 0) setCursor(value.length)
    onFocus?.()
  }, [disabled, onFocus, value.length, clampedCursor, setCursor])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.()
  }, [onBlur])

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (clampedCursor > 0) {
          const next = value.slice(0, clampedCursor - 1) + value.slice(clampedCursor)
          onChange?.(next)
          setCursor(clampedCursor - 1)
        }
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (clampedCursor > 0) setCursor(clampedCursor - 1)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (clampedCursor < len) setCursor(clampedCursor + 1)
        return
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const next = value.slice(0, clampedCursor) + e.key + value.slice(clampedCursor)
        onChange?.(next)
        setCursor(clampedCursor + 1)
      }
    },
    [disabled, value, onChange, clampedCursor, len, setCursor]
  )

  return (
    <Box
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={false}
      aria-placeholder={placeholder || undefined}
      aria-readonly={disabled ? 'true' : undefined}
      tabIndex={disabled ? undefined : 0}
      onClick={handleContainerClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      sx={{
        minHeight: 56,
        px: 1.5,
        py: 1,
        border: '1px solid',
        borderColor: isFocused ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        fontFamily: 'monospace',
        fontSize: '1rem',
        lineHeight: 1.5,
        cursor: disabled ? 'default' : 'text',
        outline: 'none',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        ...(disabled && { opacity: 0.7, pointerEvents: 'none' }),
        ...sx,
      }}
    >
      {cursorAnnouncement ? (
        <Box
          component="span"
          aria-live="polite"
          aria-atomic
          sx={visuallyHiddenSx}
        >
          {cursorAnnouncement}
        </Box>
      ) : null}
      {value.length === 0 && !isFocused && placeholder ? (
        <Box component="span" sx={{ color: 'text.disabled' }}>
          {placeholder}
        </Box>
      ) : null}
      {Array.from({ length: len + 1 }, (_, i) => (
        <Box key={i} component="span" sx={{ display: 'contents' }}>
          {i === clampedCursor && isFocused ? (
            <Box
              component="span"
              aria-hidden
              sx={{
                display: 'inline-block',
                width: 2,
                height: '1.2em',
                bgcolor: 'primary.main',
                verticalAlign: 'text-bottom',
                animation: `logic-cursor-blink ${cursorBlinkMs}ms step-end infinite`,
                '@keyframes logic-cursor-blink': { '50%': { opacity: 0 } },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          ) : null}
          {i < len ? (
            <Box component="span" data-char-index={i}>
              {value[i]}
            </Box>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}

export function insertAtCursor(value, cursorPosition, text) {
  const before = value.slice(0, cursorPosition)
  const after = value.slice(cursorPosition)
  return { newValue: before + text + after, newCursor: cursorPosition + text.length }
}

export function backspaceAtCursor(value, cursorPosition) {
  if (cursorPosition <= 0) return { newValue: value, newCursor: 0 }
  const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition)
  return { newValue, newCursor: cursorPosition - 1 }
}
