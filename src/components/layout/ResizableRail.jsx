import { useCallback, useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'

const MIN_WIDTH = 180
const MAX_WIDTH = 420
const DEFAULT_WIDTH = 240

/**
 * Left rail with a drag handle on its right edge (TOC, filters, etc.).
 */
export default function ResizableRail({
  children,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  storageKey = null,
}) {
  const readStored = () => {
    if (!storageKey || typeof window === 'undefined') return defaultWidth
    try {
      const raw = window.localStorage.getItem(storageKey)
      const value = Number(raw)
      if (Number.isFinite(value)) {
        return Math.min(maxWidth, Math.max(minWidth, value))
      }
    } catch {
      // ignore
    }
    return defaultWidth
  }

  const [width, setWidth] = useState(readStored)
  const draggingRef = useRef(false)
  const railRef = useRef(null)

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, String(width))
    } catch {
      // ignore
    }
  }, [width, storageKey])

  const clamp = useCallback(
    (value) => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  )

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!draggingRef.current || !railRef.current) return
      event.preventDefault()
      const left = railRef.current.getBoundingClientRect().left
      setWidth(clamp(event.clientX - left))
    }

    const onPointerUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [clamp])

  const startDrag = (event) => {
    event.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 24 : 12
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setWidth((prev) => clamp(prev - step))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setWidth((prev) => clamp(prev + step))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setWidth(minWidth)
    } else if (event.key === 'End') {
      event.preventDefault()
      setWidth(maxWidth)
    }
  }

  return (
    <Box
      ref={railRef}
      sx={{
        width,
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        position: 'relative',
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </Box>
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize table of contents"
        aria-valuenow={Math.round(width)}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onPointerDown={startDrag}
        onKeyDown={onKeyDown}
        sx={{
          width: '0.5rem',
          flexShrink: 0,
          cursor: 'col-resize',
          bgcolor: 'divider',
          touchAction: 'none',
          '&:hover, &:focus-visible': {
            bgcolor: 'primary.main',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
            zIndex: 1,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: '-0.25rem',
            width: '0.75rem',
          },
        }}
      />
    </Box>
  )
}
