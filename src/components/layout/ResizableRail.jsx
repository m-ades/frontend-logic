import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import {
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material'

const MIN_WIDTH = 180
const MAX_WIDTH = 420
const DEFAULT_WIDTH = 240
const COLLAPSED_WIDTH = 36

function readNumber(key, fallback, min, max) {
  if (!key || typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    const value = Number(raw)
    if (Number.isFinite(value)) {
      return Math.min(max, Math.max(min, value))
    }
  } catch {
    // ignore
  }
  return fallback
}

function readBool(key, fallback = false) {
  if (!key || typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch {
    // ignore
  }
  return fallback
}

/**
 * Left rail with resize handle; optionally collapsible to a thin expand strip.
 */
export default function ResizableRail({
  children,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  storageKey = null,
  collapsible = false,
  collapsedStorageKey = null,
  collapsed: collapsedProp = null,
  onCollapsedChange,
  collapseLabel = 'Collapse table of contents',
  expandLabel = 'Expand table of contents',
}) {
  const collapseKey = collapsedStorageKey || (storageKey ? `${storageKey}_collapsed` : null)
  const [width, setWidth] = useState(() =>
    readNumber(storageKey, defaultWidth, minWidth, maxWidth),
  )
  const [internalCollapsed, setInternalCollapsed] = useState(() =>
    readBool(collapseKey, false),
  )
  const draggingRef = useRef(false)
  const railRef = useRef(null)

  const collapsed =
    typeof collapsedProp === 'boolean' ? collapsedProp : internalCollapsed

  const setCollapsed = useCallback(
    (next) => {
      if (typeof collapsedProp !== 'boolean') {
        setInternalCollapsed(next)
      }
      onCollapsedChange?.(next)
    },
    [collapsedProp, onCollapsedChange],
  )

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, String(width))
    } catch {
      // ignore
    }
  }, [width, storageKey])

  useEffect(() => {
    if (!collapseKey || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(collapseKey, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed, collapseKey])

  const clamp = useCallback(
    (value) => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  )

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!draggingRef.current || !railRef.current || collapsed) return
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
  }, [clamp, collapsed])

  const startDrag = (event) => {
    if (collapsed) return
    event.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const onKeyDown = (event) => {
    if (collapsed) return
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

  if (collapsible && collapsed) {
    return (
      <Box
        sx={{
          width: COLLAPSED_WIDTH,
          flexShrink: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          py: 1,
        }}
      >
        <Tooltip title={expandLabel}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(false)}
            aria-label={expandLabel}
            aria-expanded={false}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <ExpandIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    )
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
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {collapsible && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              px: 0.5,
              pt: 0.5,
              flexShrink: 0,
            }}
          >
            <Tooltip title={collapseLabel}>
              <IconButton
                size="small"
                onClick={() => setCollapsed(true)}
                aria-label={collapseLabel}
                aria-expanded
                sx={{
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                <CollapseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>{children}</Box>
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
