import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  Box,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  ChevronLeft as CollapseLeftIcon,
  ChevronRight as CollapseRightIcon,
  ViewColumn as SplitIcon,
} from '@mui/icons-material'

const MIN_LEFT_PCT = 25
const MAX_LEFT_PCT = 75
const DEFAULT_LEFT_PCT = 48

/**
 * Resizable split layout: textbook (left) + workspace (right).
 * Collapses to tabs on small screens; supports pane collapse on desktop.
 */
export default function SplitViewLayout({
  left,
  right,
  leftLabel = 'Textbook',
  rightLabel = 'Assignment',
  defaultLeftPercent = DEFAULT_LEFT_PCT,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const splitterId = useId()

  const containerRef = useRef(null)
  const draggingRef = useRef(false)

  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [mobileTab, setMobileTab] = useState(0)

  const clampPercent = useCallback((value) => {
    return Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, value))
  }, [])

  const updateFromClientX = useCallback(
    (clientX) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const next = ((clientX - rect.left) / rect.width) * 100
      setLeftPercent(clampPercent(next))
    },
    [clampPercent],
  )

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!draggingRef.current) return
      event.preventDefault()
      updateFromClientX(event.clientX)
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
  }, [updateFromClientX])

  const startDrag = (event) => {
    if (leftCollapsed || rightCollapsed) return
    event.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    updateFromClientX(event.clientX)
  }

  const onSplitterKeyDown = (event) => {
    if (leftCollapsed || rightCollapsed) return
    const step = event.shiftKey ? 5 : 2
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setLeftPercent((prev) => clampPercent(prev - step))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setLeftPercent((prev) => clampPercent(prev + step))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setLeftPercent(MIN_LEFT_PCT)
    } else if (event.key === 'End') {
      event.preventDefault()
      setLeftPercent(MAX_LEFT_PCT)
    }
  }

  const expandBoth = () => {
    setLeftCollapsed(false)
    setRightCollapsed(false)
  }

  const collapseLeft = () => {
    setLeftCollapsed(true)
    setRightCollapsed(false)
  }

  const collapseRight = () => {
    setRightCollapsed(true)
    setLeftCollapsed(false)
  }

  if (isMobile) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={mobileTab}
          onChange={(_event, value) => setMobileTab(value)}
          variant="fullWidth"
          aria-label="Textbook and assignment views"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: '2.75rem',
            '& .MuiTab-root': {
              minHeight: '2.75rem',
              fontSize: '0.9375rem',
              textTransform: 'none',
            },
            '& .MuiTab-root:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '-2px',
            },
          }}
        >
          <Tab label={leftLabel} id={`${splitterId}-tab-0`} aria-controls={`${splitterId}-panel-0`} />
          <Tab label={rightLabel} id={`${splitterId}-tab-1`} aria-controls={`${splitterId}-panel-1`} />
        </Tabs>
        <Box
          role="tabpanel"
          id={`${splitterId}-panel-0`}
          aria-labelledby={`${splitterId}-tab-0`}
          hidden={mobileTab !== 0}
          sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', display: mobileTab === 0 ? 'block' : 'none' }}
        >
          {left}
        </Box>
        <Box
          role="tabpanel"
          id={`${splitterId}-panel-1`}
          aria-labelledby={`${splitterId}-tab-1`}
          hidden={mobileTab !== 1}
          sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', display: mobileTab === 1 ? 'block' : 'none' }}
        >
          {right}
        </Box>
      </Box>
    )
  }

  const showLeft = !leftCollapsed
  const showRight = !rightCollapsed
  const showSplitter = showLeft && showRight

  let leftFlex = `${leftPercent}%`
  let rightFlex = `${100 - leftPercent}%`
  if (!showLeft) {
    leftFlex = '0%'
    rightFlex = '100%'
  } else if (!showRight) {
    leftFlex = '100%'
    rightFlex = '0%'
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          flexShrink: 0,
        }}
      >
        <Tooltip title={leftCollapsed ? `Show ${leftLabel}` : `Hide ${leftLabel}`}>
          <IconButton
            size="small"
            onClick={() => (leftCollapsed ? expandBoth() : collapseLeft())}
            aria-label={leftCollapsed ? `Expand ${leftLabel} pane` : `Collapse ${leftLabel} pane`}
            aria-pressed={leftCollapsed}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <CollapseLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Show both panes">
          <IconButton
            size="small"
            onClick={expandBoth}
            aria-label="Show both textbook and assignment panes"
            disabled={showLeft && showRight}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <SplitIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={rightCollapsed ? `Show ${rightLabel}` : `Hide ${rightLabel}`}>
          <IconButton
            size="small"
            onClick={() => (rightCollapsed ? expandBoth() : collapseRight())}
            aria-label={rightCollapsed ? `Expand ${rightLabel} pane` : `Collapse ${rightLabel} pane`}
            aria-pressed={rightCollapsed}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <CollapseRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <Box
          component="section"
          aria-label={leftLabel}
          sx={{
            flexBasis: leftFlex,
            flexGrow: 0,
            flexShrink: 0,
            width: leftFlex,
            minWidth: 0,
            display: showLeft ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: showSplitter ? 1 : 0,
            borderColor: 'divider',
          }}
        >
          {left}
        </Box>

        {showSplitter && (
          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize textbook and assignment panes"
            aria-valuenow={Math.round(leftPercent)}
            aria-valuemin={MIN_LEFT_PCT}
            aria-valuemax={MAX_LEFT_PCT}
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={onSplitterKeyDown}
            sx={{
              width: '0.5rem',
              flexShrink: 0,
              cursor: 'col-resize',
              bgcolor: 'divider',
              position: 'relative',
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
                inset: '0 -0.35rem',
              },
            }}
          />
        )}

        <Box
          component="section"
          aria-label={rightLabel}
          sx={{
            flexBasis: rightFlex,
            flexGrow: 1,
            flexShrink: 1,
            width: rightFlex,
            minWidth: 0,
            display: showRight ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {right}
        </Box>
      </Box>
    </Box>
  )
}
