import { useCallback, useEffect, useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import {
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material'
import { useHorizontalResize } from '@/hooks/useHorizontalResize.js'

const MIN_WIDTH = 180
const MAX_WIDTH = 420
const DEFAULT_WIDTH = 240
const COLLAPSED_WIDTH = 36

function widthFromClientX(clientX, bounds) {
  return clientX - bounds.left
}

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
  const [internalCollapsed, setInternalCollapsed] = useState(() =>
    readBool(collapseKey, false),
  )

  const collapsed =
    typeof collapsedProp === 'boolean' ? collapsedProp : internalCollapsed
  const {
    value: width,
    targetRef: railRef,
    separatorProps,
  } = useHorizontalResize({
    initialValue: () => readNumber(storageKey, defaultWidth, minWidth, maxWidth),
    minValue: minWidth,
    maxValue: maxWidth,
    step: 12,
    largeStep: 24,
    valueFromClientX: widthFromClientX,
    disabled: collapsed,
  })

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
        {...separatorProps}
        aria-label="Resize table of contents"
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
