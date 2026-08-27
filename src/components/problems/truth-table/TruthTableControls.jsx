import { ButtonBase, Tooltip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

const DEFAULT_TOGGLE_VALUES = ['T', 'F']

export function TruthValueButton({
  value,
  onChange,
  ariaLabel,
  accent = false,
  readOnly = false,
  toggleValues = DEFAULT_TOGGLE_VALUES,
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const primary = theme.palette.primary.main
  const resolvedColor = (() => {
    if (value === 'T') return primary
    if (value === 'F') return '#b22'
    if (value === 'B') return theme.palette.success.main
    if (accent) return primary
    if (value) return theme.palette.secondary.main
    return isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)'
  })()

  const cycleValue = (current) => {
    const values = toggleValues?.length ? toggleValues : DEFAULT_TOGGLE_VALUES
    if (!current) return values[0]
    const currentIndex = values.indexOf(current)
    if (currentIndex === -1) return values[0]
    if (currentIndex < values.length - 1) return values[currentIndex + 1]
    return ''
  }

  return (
    <ButtonBase
      aria-label={ariaLabel}
      disabled={readOnly}
      onClick={() => onChange?.(cycleValue(value))}
      disableRipple
      sx={{
        fontSize: '1.125rem',
        fontWeight: 700,
        color: resolvedColor,
        textTransform: 'uppercase',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        inset: 0,
        px: 0.25,
        py: 0.5,
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'color 0.12s ease, transform 0.12s ease, text-shadow 0.12s ease',
        transform: 'scale(1)',
        textShadow: 'none',
        '@media (hover: hover)': {
          '&:hover': {
            color: resolvedColor,
            transform: 'scale(1.08)',
            fontWeight: 800,
            textShadow: accent ? `0 0 10px ${alpha(primary, 0.18)}` : 'none',
          },
        },
        '&:active': {
          transform: 'scale(0.96)',
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(primary, 0.6)}`,
          outlineOffset: 2,
        },
      }}
    >
      {value || '-'}
    </ButtonBase>
  )
}

// row selector uses a visible label and exposes selected state
export function TruthTableSelectorButton({ selected, onClick, ariaLabel, tooltip, label }) {
  const theme = useTheme()
  const primary = theme.palette.primary.main
  const borderColor = theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.18)'
    : 'rgba(0, 0, 0, 0.16)'
  const selectedBg = theme.palette.mode === 'dark'
    ? alpha(primary, 0.22)
    : alpha(primary, 0.12)

  return (
    <Tooltip title={tooltip || ''}>
      <ButtonBase
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={onClick}
        sx={{
          width: 28,
          height: 28,
          minWidth: 28,
          minHeight: 28,
          border: `1px solid ${selected ? primary : borderColor}`,
          borderRadius: 1,
          bgcolor: selected ? selectedBg : 'transparent',
          color: selected ? primary : 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'background-color 0.16s ease, border-color 0.16s ease, transform 0.12s ease',
          '&:hover': {
            borderColor: primary,
            bgcolor: selected ? selectedBg : alpha(primary, 0.06),
          },
          '&:focus-visible': {
            outline: `2px solid ${alpha(primary, 0.6)}`,
            outlineOffset: 2,
          },
        }}
      >
        {label}
      </ButtonBase>
    </Tooltip>
  )
}
