// renders the shared derivation style row of logic symbol keys
// each button provides a stable key label accessible label and payload
// onselect receives the payload while insertion behavior stays with the caller

import { Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'

export function getLogicSymbolKeySx(density = 'standard') {
  const compact = density === 'compact'
  const touch = density === 'touch'
  return {
    minWidth: touch ? 42 : (compact ? 28 : 34),
    px: touch ? 1.25 : (compact ? 0.75 : 1),
    py: touch ? 0.5 : 0.35,
    fontSize: touch ? '1.0625rem' : (compact ? '0.8125rem' : '0.95rem'),
    lineHeight: 1.1,
    minHeight: touch ? 44 : 32,
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    border: 'none',
    bgcolor: (theme) => theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.08)
      : theme.palette.grey[100],
    color: 'text.primary',
    '&:hover': (theme) => ({
      boxShadow: 'none',
      border: 'none',
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
    }),
  }
}

export default function LogicSymbolKeyRow({
  buttons,
  onSelect,
  disabled = false,
  density = 'standard',
  wrap = true,
  center = false,
  gap = 0.5,
  ariaLabel = 'Symbol shortcuts',
  sx,
}) {
  const buttonSx = getLogicSymbolKeySx(density)

  return (
    <Stack
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      direction="row"
      alignItems="center"
      flexWrap={wrap ? 'wrap' : 'nowrap'}
      useFlexGap
      gap={gap}
      justifyContent={center ? 'center' : 'flex-start'}
      sx={sx}
    >
      {buttons.map((button) => (
        <Button
          key={button.key ?? button.label}
          type="button"
          size="small"
          variant="outlined"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(button.payload ?? button)}
          disabled={disabled || button.disabled}
          aria-label={button.ariaLabel}
          title={button.ariaLabel}
          sx={buttonSx}
        >
          {button.content ?? button.label}
        </Button>
      ))}
    </Stack>
  )
}
